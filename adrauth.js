const { v4: uuidv4 } = require("uuid");
var cookie = require("cookie");
var bcrypt = require("bcrypt");

var utils = require("./utils.js");

var globals = {
  tokentimeout: 1.2, //minutes
  consoleLog: false,
};

module.exports = {
  Adrauth: class {
    constructor(options, callback) {
      //var self = this;
      //console.log(`constructor start`, this)
      if (options.mode) {
        if (options.mode == "postgres") {
          var { DBLink } = require("./connectors/postgres.js");

        } else if (options.mode == "single-json-file") {
          var { DBLink } = require("./connectors/singleJSON.js");

        } else if (options.mode == "s3") {
          var { DBLink } = require("./connectors/s3.js");
          
        } else {
          callback(
            `mode setting does not match any compatible modes. got '${options.mode}'`
          );
        }

          if (options.connect) {
            if (!options.tokentimeout) {
              options.tokentimeout = 7;
            }

            //console.log(`DBLink omw`, this)
            this.tokentimeout = options.tokentimeout;
            //var self = this;
            
            //var clGlobals = this;
            //spawn the loop that will check for tokens
            this.expiredTokenLoop = (loopSecs) => {
              setTimeout(() => {
                var now = new Date();
                var nowTime = Math.round(now.getTime() / 1000);
                //console.log(nowTime);

                this.db
                  .delete("tokens", { expiry: nowTime }, ["<"])
                  .then((done) => {
                    if (done.rowCount > 0) {
                      console.log(`${done.rowCount} expired tokens were deleted`);
                    }
                    this.expiredTokenLoop(loopSecs);
                  })
                  .catch((err) => {
                    console.error(err);
                  });
              }, loopSecs * 1000);
            };

            //spawn a new Postgres DBLink
            this.db = new DBLink(options.connect, (err, resp) => {
              if (err) {
                callback(err);
              } else {
                this.expiredTokenLoop(12);
                //console.log(`DBLink created`, this);

                callback(null, resp);
              }
            });

          } else {
            callback(
              `connect setting required for ${options.mode}, object containing host, user, and password for connection`
            );
          }
        
      } else {
        callback("mode setting is required to spawn adrauth");
      }
    }
    login() {
      console.log(`login called`, this);
      return (req, res, next) => {
        //let console = kind.logger('adrauth.login MW');
        console.log(`login called`, this);

        var email = req.headers.email;
        var pass = req.headers.pass;
        var rem = req.headers.rem;
        //var db = this.db;

        console.log(rem)
        let tokenTimeout = rem == "false" ? this.tokentimeout : this.tokentimeout + (43800 * 12)
        /*
        if (rem != "false") {
          //console.log(`REM WAS TRUE`)
          tokenTimeout = this.tokentimeout + (43800*12)
        } else {
          //console.log(`REM WAS NOT TRUE`)
          tokenTimeout = this.tokentimeout
        }*/

        if (email && pass) {
          checkUser(this.db, email, pass)
            .then((user) => {
              //user is valid, generate key and send back
              console.log(user);
              getNewToken(
                this.db,
                email,
                {
                  fullname: user.fullname,
                  permissions: user.permissions,
                  id: user.id,
                },
                tokenTimeout
              )
                .then((resp) => {
                  var userToken = resp;

                  if (globals.consoleLog) {
                    console.log(`token get`);
                    console.log(userToken);
                    console.log(JSON.stringify(userToken));
                  }

                  res.send(JSON.stringify(userToken));
                })
                .catch((err) => {
                  console.error(err);
                  res.send("nope");
                });
            })
            .catch((err) => {
              //user is invalid
              console.error(err);
              res.send("nope");
            });
        } else {
          res.send("nope");
        }
      };
    }
    refreshToken() {
      return (req, res, next) => {

        var email = req.headers.email;
        var token = req.headers.token;

        var db = this.db;

        refreshToken(db, token, email, this.tokentimeout)
          .then((newToken) => {
            //send new token back to user
            res.send(JSON.stringify(newToken));
          })
          .catch((err) => {
            //error refreshing token, redirect to login
            res.send("nope");
          });
      };
    }
    logout() {
      return (req, res, next) => {
        var db = this.db;

        if (req.cookies.token) {
          var token = JSON.parse(req.cookies.token).token;
          var email = JSON.parse(req.cookies.token).email;

          logout(db, email, token)
            .then((logoutResult) => {
              //logout succeeded
              res.redirect("/login");
            })
            .catch((err) => {
              //logout failed
              console.error(err);
              res.redirect("/login?err=logoutfailed");
            });
        } else {
          //logout failed
          res.redirect("/login?err=logoutfailed");
        }
      };
    }
    checkTokenCookie(permReq) {
      return (req, res, next) => {
        var db = this.db;
        //console.log(req.cookies);

        if (req.cookies.token) {
          var fullToken = JSON.parse(req.cookies.token);
          var token = fullToken.token;
          var email = fullToken.email;
          var origLocation = req.url;
          var now = new Date();
          var nowTime = Math.round(now.getTime() / 1000);

          db.selectAll("tokens", { token, email })
            .then((resp) => {
              console.log(`GOT TO CHECKTOKENCOOKIE`);
              var dbToken = resp.rows[0];
              console.log(dbToken);
              if (dbToken.expiry > nowTime) {
                //current token not expired, allow this access
                if (permReq) {
                  //an explicit permission was required, check for it
                  //console.log(dbToken, dbToken.permissions)
                  hasPerm(db, dbToken.email, permReq, dbToken.permissions)
                    .then(() => {
                      //permission granted
                      console.log(`Access granted to route`);
                      req.token = dbToken;
                      return next();
                    })
                    .catch((err) => {
                      //permission denied
                      console.log(`Access denied to route`);
                      console.error(err);
                      res.redirect("/denied");
                    });
                } else {
                  console.log("token good");
                  req.token = fullToken;
                  //succeeded = true;
                  return next();
                }
              } else {
                //token is expired, redirect to login
                res.redirect("/login");
              }
            })
            .catch((err) => {
              //no token found, redirect to login
              console.log(`LOGIN ERROR`);
              console.error(err);
              res.redirect("/login");
            });
        } else {
          //no token supplied, reject this request
          res.redirect("/login");
        }
      };
    }
    setPassword(/* cookies and headers only :3 */) {
      return (req, res, next) => {
        var db = this.db;
        //console.log(`at middleware!!!! on setPassword`)
        if (req.cookies.token) {
          var fullToken = JSON.parse(req.cookies.token);
          var token = fullToken.token;
          var email = fullToken.email;
          var newPass = req.headers.newpassw;

          var now = new Date();
          var nowTime = Math.round(now.getTime() / 1000);

          setPassword(db, email, newPass)
            .then((resp) => {
              console.log(`Success - Password set`);
              res.end("success");
            })
            .catch((err) => {
              //password change failed
              console.error(err);
              res.end("password change failed");
            });
        } else {
          //no token supplied, reject this request
          res.redirect("/login");
        }
      };
    }
  },
};

function checkUser(db, email, pass) {
  return new Promise((resolve, reject) => {
    db.selectAll("users", { email })
      .then((resp) => {
        if (resp.rows.length > 0) {
          //user found
          dbPass = resp.rows[0].pass;
          bcrypt.compare(pass, dbPass, function (err, res) {
            if (err) {
              //error comparing
              reject(err);
            } else if (res) {
              //password correct

              resolve(resp.rows[0]);
            } else {
              //wrong password
              reject(`wrong password`);
            }
          });
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
}

function getNewToken(db, email, add, tokentimeout) {
  return new Promise((resolve, reject) => {

    var token = uuidv4() + "-" + uuidv4() + "-" + uuidv4();
    var now = new Date();
    var expiry = Math.round(now.getTime() / 1000) + tokentimeout * 60;
    var tokenObj = {
      token,
      email,
      expiry,
      createtime: Math.round(now.getTime() / 1000),
    };
    //var userTokenObj = {token, expiry};

    if (add) {
      //merge the "add" object, to add values to a token
      //console.log(`getNewToken YES ADD`);
      //console.log(add);
      var newTokenObj = {
        ...tokenObj,
        ...add,
      };

      db.insert("tokens", newTokenObj)
        .then((resp) => {
          console.log(`Database token insert complete`);
          resolve(newTokenObj);
        })
        .catch((err) => {
          console.error(err);
          reject(err);
        });
    } else {
      //nothing needs to be added
      db.insert("tokens", tokenObj)
        .then((resp) => {
          console.log(`Database token insert complete`);
          resolve(tokenObj);
        })
        .catch((err) => {
          console.error(err);
          reject(err);
        });
    }
  });
}

function refreshToken(db, token, email, tokentimeout) {
  return new Promise((resolve, reject) => {
    //check if current token is still valid
    db.selectAll("tokens", { token, email })
      .then((resp) => {
        if (resp.rows.length > 0) {
          //token is valid
          //get a new one, then delete the old one
          var dbToken = resp.rows[0];

          getNewToken(
            db,
            email,
            {
              fullname: dbToken.fullname,
              permissions: dbToken.permissions,
              id: dbToken.id,
            },
            tokentimeout
          )
            .then((newToken) => {
              //new token received, delete the old one then send the new one back
              db.delete("tokens", { token })
                .then((resp) => {
                  //old token deleted
                  console.log(resp.rows.length);
                  console.log(`Database token delete complete`);
                  resolve(newToken);
                })
                .catch((err) => {
                  console.error(err);
                  reject(`invalid`);
                });
            })
            .catch((err) => {
              console.error(err);
              reject(`invalid`);
            });
        } else {
          //no rows found
          reject("no token found");
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
}

function logout(db, email, token) {
  return new Promise((resolve, reject) => {
    //actually logout in the database

    db.delete("tokens", { token })
      .then((resp) => {
        //database logout complete
        resolve();
      })
      .catch((err) => {
        console.error(err);
        reject(`unauthorized db`);
      });
  });
}

function hasPerm(db, email, perm, userperms) {
  return new Promise((resolve, reject) => {
    var userPerms = utils.miniCSV.parse(userperms);

    db.selectAll("permissions")
      .then((resp) => {
        //check all db permissions to see if the required one exists
        //console.log(resp.rows)
        var resultantPerms = getResultantPerms(resp.rows, userPerms)
        //console.log(resultantPerms)

        for (var resultantPerm of resultantPerms) {
          if (resultantPerm == perm) {
            //user has required perm
            resolve()
          }

        }

        reject(
          `required permission: '${perm}' was not found for user '${email}'`
        );
      })
      .catch((err) => {
        reject(err);
      });
  });
}

function getResultantPerms(dbPerms, userPermNames) {
  //extracts resultant permission string from array of named perms/groups
  //var userPerms = utils.miniCSV.parse(userPermNames);
  var userPerms = userPermNames;
  var resultantPerms = []

  for (var userPerm of userPerms) {
    for (var dbPerm of dbPerms) {
      //check if user has perm
      if (userPerm == dbPerm.name) {
        //user has this dbPerm
        if (dbPerm.isgroup === true) {
          //this dbPerm is a group
          var thisGroupPerms = utils.miniCSV.parse(dbPerm.consists)
          resultantPerms = [...resultantPerms, ...thisGroupPerms]
        } else {
          //this dbPerm is NOT a group
          resultantPerms.push(dbPerm.name)
        }
      }
    }
  }

  var cleanOut = [...new Set(resultantPerms)]

  return cleanOut
}

function setPassword(db, email, pass) {
  return new Promise((reslove, reject) => {
    bcrypt.hash(pass, 13, (err, hash) => {
      // Now we can store the password hash in db.
      if (err) {
        reject(err);
      } else {
        db.update("users", { pass: hash }, { email })
          .then((resp) => {
            reslove(resp.rows);
          })
          .catch((err) => {
            reject(err);
          });
      }
    });
  });
}
