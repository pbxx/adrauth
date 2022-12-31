const { Pool, Client } = require('pg')
const { v4: uuidv4 } = require('uuid');
var bcrypt = require('bcrypt');

var utils = require("../utils.js");

var globals = {
	consoleLog: false,
}


module.exports = {
	DBLink: class {
		constructor(options, callback) {
			//check for host, username, and password
			if (options.host) {
				//host present
				if (options.user) {
					//user present
					if (options.password) {
						//password present, all clear for this.pool creation
						try {
							var defaultOptions = {
								database: "postgres",
								port: 5432,
								max: 20,
								idleTimeoutMillis: 30000,
								connectionTimeoutMillis: 2000,
							}
							
							//merge defaults with passed options
							options = {
								...defaultOptions,
								...options,
							}
							//this.options = options

							//create this.pool
							this.pool = new Pool(options);
							callback(null, "DBLink created")
						} catch (err) {
							callback(err)
						}

					} else {
						callback("PostgreSQL password required")
					}
				} else {
					callback("PostgreSQL username required")
				}
			} else {
				callback("PostgreSQL host required")
			}
		}
		insert(table, object) {
			return new Promise((resolve, reject) => {
				try {
					var fName = "db.insert";
					//object keys will become columns, object values will be written to those columns
					//make sure <object> is an actual object
					if (typeof(object) == "object" && !Array.isArray(object)) {
						if (typeof(table) == "string") {
							var colsArr = Object.keys(object);
							var valuesArr = [];
							var valDollarIncrement = 1;
							var valDollars = "";
							var cols = "";
							
							if (colsArr.length > 1) {
								//iterate through all keys
								for (var key of colsArr) {
									if (key == colsArr[colsArr.length-1]) {
										//this is the last key, dont add a comma to <cols>
										cols += key;
										valDollars += ("$" + valDollarIncrement)
										valuesArr.push(object[key]);
									} else {
										//this is *not* the last key
										cols += `${key}, `;
										valDollars += ("$" + valDollarIncrement + ", ")
										valDollarIncrement++
										valuesArr.push(object[key]);
									}
								}
							} else {
								//only one key, no need to loop
								cols = colsArr[0];
								valDollars = "$1"
								valuesArr.push(object[colsArr[0]]);
							}
							
							this.pool.connect((err, client, release) => {
								if (err) {
									return console.error('Error acquiring client', err.stack)
								}
								var query = `INSERT INTO ${table}(${cols}) VALUES (${valDollars});`;
								console.log(query)
								if (globals.consoleLog) { console.log("[INFO db.insert]", cols, valuesArr, valDollars, query) }
								client.query(query, valuesArr, (err, res) => {
									if (err) {
										//err writing to db
										release()
										reject(err)
									} else {
										//item written to db
										release()
										resolve(res)
									}
								})
							})
							
							
						} else {
							reject(`[ERR: ${fName}] First argument must be of type 'string', got '${typeof(table)}'.`)
						}
					} else {
						reject(`[ERR: ${fName}] Second argument must be of type 'object', got '${typeof(object)}'.`)
					}
				} catch (err) {
					reject(err)
				}
			});
		}
		delete(table, cases, opArray) {
			return new Promise((resolve, reject) => {
				try {
					var fName = "db.delete";
					//object keys will become columns, object values will be written to those columns
					//make sure <object> is an actual object
					if (typeof(cases) == "object" && !Array.isArray(cases)) {
						if (typeof(table) == "string") {
							var casesArr = Object.keys(cases);
							var oaIncrement = 0;
							var valDollarIncrement = 1;
							var valArray = [];
							var valCases = "";
							
							if (casesArr.length > 1) {
								//iterate through all keys
								for (var ncase of casesArr) {
									if (ncase == casesArr[casesArr.length-1]) {
										//this is the last ncase
										if (opArray) {
											if (Array.isArray(opArray)) {
												//an operator array was passed, and it is actually an array
												if (typeof(opArray[oaIncrement]) == "string") {
													if (typeof(cases[ncase]) == "string") {
														valCases += `${ncase} ${opArray[oaIncrement]} '` + "$" + valDollarIncrement + "'";
													} else {
														valCases += `${ncase} ${opArray[oaIncrement]} ` + "$" + valDollarIncrement;
													}
													valArray.push(cases[ncase]);
													valDollarIncrement++;
													oaIncrement++;
												} else {
													//all opArray items must be string
													reject(`[ERR: ${fName}] All values in third argument array must be string.`);
												}
											} else {
												//opArray must be array
												reject(`[ERR: ${fName}] If third argument is used, it must be an array. Got '${typeof(opArray)}'.`);
											}
										} else {
											//no opArray was passed at all, or it was falsy
											valCases += `${ncase} = '` + "$" + valDollarIncrement + "'";
											valArray.push(cases[ncase]);
											valDollarIncrement++;
										}
									} else {
										//this is *not* the last ncase
										if (opArray) {
											if (Array.isArray(opArray)) {
												//an operator array was passed, and it is actually an array
												if (typeof(opArray[oaIncrement]) == "string") {
													if (typeof(cases[ncase]) == "string") {
														valCases += `${ncase} ${opArray[oaIncrement]} '` + "$" + valDollarIncrement + "' AND ";
													} else {
														valCases += `${ncase} ${opArray[oaIncrement]} ` + "$" + valDollarIncrement + " AND ";
													}
													valArray.push(cases[ncase]);
													valDollarIncrement++;
													oaIncrement++;
												} else {
													//all opArray items must be string
													reject(`[ERR: ${fName}] All values in third argument array must be string.`);
												}
											} else {
												//opArray must be array
												reject(`[ERR: ${fName}] If third argument is used, it must be an array. Got '${typeof(opArray)}'.`);
											}
										} else {
											//no opArray was passed at all, or it was falsy
											valCases += `${ncase} = '` + "$" + valDollarIncrement + "' AND ";
											valArray.push(cases[ncase]);
											valDollarIncrement++;
											
										}
									}
								}
							} else {
								//only one ncase, no need to loop
								if (opArray && Array.isArray(opArray)) {
									if (typeof(cases[casesArr[0]]) == "string") {
										valCases = `${casesArr[0]} ${opArray[0]} '${cases[casesArr[0]]}'`;
									} else {
										valCases = `${casesArr[0]} ${opArray[0]} ${cases[casesArr[0]]}`;
									}
								} else {
									if (typeof(cases[casesArr[0]]) == "string") {
										valCases = `${casesArr[0]} = '${cases[casesArr[0]]}'`;
									} else {
										valCases = `${casesArr[0]} = ${cases[casesArr[0]]}`;
									}
								}
							}
							
							this.pool.connect((err, client, release) => {
								if (err) {
									return console.error('Error acquiring client', err.stack)
								}
								//var query = `INSERT INTO ${table}(${cols}) VALUES (${valCases});`;
								var query = `DELETE FROM ${table} WHERE ${valCases};`;
								//console.log(query)
								if (globals.consoleLog) { console.log(query) }
								client.query(query, valArray, (err, res) => {
									if (err) {
										//err writing to db
										release()
										reject(err)
									}
									//item written to db
									release()
									resolve(res)
								})
							})
							
							
						} else {
							reject(`[ERR: ${fName}] First argument must be of type 'string', got '${typeof(table)}'.`)
						}
					} else {
						reject(`[ERR: ${fName}] Second argument must be of type 'object', got '${typeof(cases)}'.`)
					}
				} catch (err) {
					reject(err)
				}
			});
		}
		selectAll(table, cases, opArray) {
			return new Promise((resolve, reject) => {
				try {
					var fName = "db.selectAll";
					//object keys will become columns, object values will be written to those columns
					//make sure <object> is an actual object
					if (typeof(table) == "string") {
						processCases(cases, opArray)
                        .then((valueSet) => {
                            //valueSet is an object that contains:
                            //valueSet.valArray: the Array that actually contains the data to be filtered
                            //valueSet.valCases: literal SQL/native query string representing the templated $ values, to be inserted into the query
                            if (typeof(cases) == "object" && !Array.isArray(cases)) {
                                //selection cases were specified, select all from table where cases match
                                var query = `SELECT * FROM ${table} WHERE ${valueSet.valCases};`;

                                dbQuery(this.pool, query, valueSet.valArray)
                                .then((queryRes) => {
                                    resolve(queryRes)
                                })
                                .catch((err) => {
                                    reject(err)
                                })
                                
                                
                            } else {
                                //no selection cases provided, select all from requested table
                                var query = `SELECT * FROM ${table}`;
                                
                                dbQuery(this.pool, query)
                                .then((queryRes) => {
                                    resolve(queryRes)
                                })
                                .catch((err) => {
                                    reject(err)
                                })
                            }
                        })
                        .catch((err) => {
                            //error running processCases()
                            //handle error
                            reject({errText: `[ERR: ${fName}] Error running processCases()`, err})
                        })

					} else {
                        //table name was not string
						reject(`[ERR: ${fName}] First argument must be of type 'string', got '${typeof(table)}'.`)
					}
				} catch (err) {
                    //general error occurred, in the whole try{}catch block
					reject(err)
				}
			});
		}
		rowCountEstimate(table) {
			return new Promise((resolve, reject) => {
				try {
					var fName = "db.rowCountEstimate";
					//object keys will become columns, object values will be written to those columns
					//make sure <object> is an actual object
					if (typeof(table) == "string") {
						this.pool.connect((err, client, release) => {
							if (err) {
								return console.error('Error acquiring client', err.stack)
							}
							
							var query = `SELECT reltuples AS estimate FROM pg_class WHERE relname = '${table}';`;
							client.query(query, (err, res) => {
								if (err) {
									//err writing to db
									release()
									reject(err)
								}
								//item written to db
								release()
								resolve(res.rows[0].estimate)
							})
						})
						
					} else {
						reject(`[ERR: ${fName}] First argument must be of type 'string', got '${typeof(table)}'.`)
					}
				} catch (err) {
					reject(err)
				}
			});
		}
		rowCount(table) {
			return new Promise((resolve, reject) => {
				try {
					var fName = "db.rowCount";
					//object keys will become columns, object values will be written to those columns
					//make sure <object> is an actual object
					if (typeof(table) == "string") {
						this.pool.connect((err, client, release) => {
							if (err) {
								return console.error('Error acquiring client', err.stack)
							}
							
							var query = `SELECT count(*) FROM ${table};`;
							client.query(query, (err, res) => {
								if (err) {
									//err writing to db
									release()
									reject(err)
								}
								//item written to db
								release()
								resolve(res.rows[0].count)
							})
						})
						
					} else {
						reject(`[ERR: ${fName}] First argument must be of type 'string', got '${typeof(table)}'.`)
					}
				} catch (err) {
					reject(err)
				}
			});
		}
		selectCols(table, cols, cases, opArray) {
			return new Promise((resolve, reject) => {
				try {
					var fName = "db.selectCols";
					//object keys will become columns, object values will be written to those columns
					//make sure <object> is an actual object
					if (typeof(table) == "string") {
						if (typeof(cols) == "string") {
							var oaIncrement = 0;
							var valDollarIncrement = 1;
							var valArray = [];
							var valCases = "";
							
							if (typeof(cases) == "object" && !Array.isArray(cases)) {
								var casesArr = Object.keys(cases);
								if (casesArr.length > 1) {
									//iterate through all keys
									for (var ncase of casesArr) {
										if (ncase == casesArr[casesArr.length-1]) {
											//this is the last ncase
											if (opArray) {
												if (Array.isArray(opArray)) {
													//an operator array was passed, and it is actually an array
													if (typeof(opArray[oaIncrement]) == "string") {
														valCases += `${ncase} ${opArray[oaIncrement]} ` + "$" + valDollarIncrement;
														valArray.push(cases[ncase]);
														valDollarIncrement++;
														oaIncrement++;
													} else {
														//all opArray items must be string
														reject(`[ERR: ${fName}] All values in third argument array must be string.`);
													}
												} else {
													//opArray must be array
													reject(`[ERR: ${fName}] If fourth argument is used, it must be an array. Got '${typeof(opArray)}'.`);
												}
											} else {
												//no opArray was passed at all, or it was falsy
												valCases += `${ncase} = ` + "$" + valDollarIncrement;
												valArray.push(cases[ncase]);
												valDollarIncrement++;
											}
										} else {
											//this is *not* the last ncase
											if (opArray) {
												if (Array.isArray(opArray)) {
													//an operator array was passed, and it is actually an array
													if (typeof(opArray[oaIncrement]) == "string") {
														valCases += `${ncase} ${opArray[oaIncrement]} ` + "$" + valDollarIncrement + " AND ";
														valArray.push(cases[ncase]);
														valDollarIncrement++;
														oaIncrement++;
													} else {
														//all opArray items must be string
														reject(`[ERR: ${fName}] All values in third argument array must be string.`);
													}
												} else {
													//opArray must be array
													reject(`[ERR: ${fName}] If fourth argument is used, it must be an array. Got '${typeof(opArray)}'.`);
												}
											} else {
												//no opArray was passed at all, or it was falsy
												valCases += `${ncase} = ` + "$" + valDollarIncrement + " AND ";
												valArray.push(cases[ncase]);
												valDollarIncrement++;
												
											}
										}
									}
								} else {
									//only one ncase, no need to loop
									if (opArray && Array.isArray(opArray)) {
										valCases = `${casesArr[0]} ${opArray[0]} ` + "$1";
										valArray.push(cases[casesArr[0]]);
									} else {
										valCases = `${casesArr[0]} = ` + "$1";
										valArray.push(cases[casesArr[0]]);
									}
								}
							}
							
							
							
							//var query = `INSERT INTO ${table}(${cols}) VALUES (${valCases});`;
							if (typeof(cases) == "object" && !Array.isArray(cases)) {
								this.pool.connect((err, client, release) => {
									if (err) {
										return console.error('Error acquiring client', err.stack)
									}
									var query = `SELECT ${cols} FROM ${table} WHERE ${valCases};`;
									if (globals.consoleLog) { console.log(`[INFO ${fName}]`, valArray, valCases, query) }
									client.query(query, valArray, (err, res) => {
										if (err) {
											//err writing to db
											release()
											reject(err)
										}
										//item written to db
										release()
										resolve(res)
									})
								})
								
								
							} else {
								this.pool.connect((err, client, release) => {
									if (err) {
										return console.error('Error acquiring client', err.stack)
									}
									var query = `SELECT ${cols} FROM ${table}`;
									if (globals.consoleLog) { console.log(`[INFO ${fName}]`, query) }
									client.query(query, (err, res) => {
										if (err) {
											//err writing to db
											release()
											reject(err)
										}
										//item written to db
										release()
										resolve(res)
									})
								})
								
							}
						} else {
							reject(`[ERR: ${fName}] Second argument must be of type 'string', got '${typeof(cols)}'.`)
						}
					} else {
						reject(`[ERR: ${fName}] First argument must be of type 'string', got '${typeof(table)}'.`)
					}
				} catch (err) {
					reject(err)
				}
			});
		}
		update(table, values, cases, opArray) {
			return new Promise((resolve, reject) => {
				try {
					var fName = "db.update";
					//object keys will become columns, object values will be written to those columns
					//make sure <object> is an actual object
					if (typeof(table) == "string") {
						if (typeof(values) == "object" && !Array.isArray(values)) {
							var oaIncrement = 0;
							var valDollarIncrement = 1;
							var valArray = [];
							var valCases = "";
							var valValues = "";
							
							if (typeof(cases) == "object" && !Array.isArray(cases)) {
								//cases is set
								var casesArr = Object.keys(cases);
								if (casesArr.length > 1) {
									//iterate through all keys
									for (var ncase of casesArr) {
										if (ncase == casesArr[casesArr.length-1]) {
											//this is the last ncase
											if (opArray) {
												if (Array.isArray(opArray)) {
													//an operator array was passed, and it is actually an array
													if (typeof(opArray[oaIncrement]) == "string") {
														valCases += `${ncase} ${opArray[oaIncrement]} ` + "$" + valDollarIncrement;
														valArray.push(cases[ncase]);
														valDollarIncrement++;
														oaIncrement++;
													} else {
														//all opArray items must be string
														reject(`[ERR: ${fName}] All values in third argument array must be string.`);
													}
												} else {
													//opArray must be array
													reject(`[ERR: ${fName}] If fourth argument is used, it must be an array. Got '${typeof(opArray)}'.`);
												}
											} else {
												//no opArray was passed at all, or it was falsy
												valCases += `${ncase} = ` + "$" + valDollarIncrement;
												valArray.push(cases[ncase]);
												valDollarIncrement++;
											}
										} else {
											//this is *not* the last ncase
											if (opArray) {
												if (Array.isArray(opArray)) {
													//an operator array was passed, and it is actually an array
													if (typeof(opArray[oaIncrement]) == "string") {
														valCases += `${ncase} ${opArray[oaIncrement]} ` + "$" + valDollarIncrement + " AND ";
														valArray.push(cases[ncase]);
														valDollarIncrement++;
														oaIncrement++;
													} else {
														//all opArray items must be string
														reject(`[ERR: ${fName}] All values in third argument array must be string.`);
													}
												} else {
													//opArray must be array
													reject(`[ERR: ${fName}] If fourth argument is used, it must be an array. Got '${typeof(opArray)}'.`);
												}
											} else {
												//no opArray was passed at all, or it was falsy
												valCases += `${ncase} = ` + "$" + valDollarIncrement + " AND ";
												valArray.push(cases[ncase]);
												valDollarIncrement++;
												
											}
										}
									}
								} else {
									//only one ncase, no need to loop
									if (opArray && Array.isArray(opArray)) {
										valCases = `${casesArr[0]} ${opArray[0]} ` + "$" + valDollarIncrement;
										valArray.push(cases[casesArr[0]]);
										valDollarIncrement++;
									} else {
										valCases = `${casesArr[0]} = ` + "$" + valDollarIncrement;
										valArray.push(cases[casesArr[0]]);
										valDollarIncrement++;
									}
								}
							}
							
							var keysArr = Object.keys(values);
							if (keysArr.length > 1) {
								//iterate through all keys
								for (key of keysArr) {
									if (key == keysArr[keysArr.length-1]) {
										//this is the last key
										valValues += `${key} = ` + "$" + valDollarIncrement;
										valArray.push(values[key]);
										valDollarIncrement++;
										
									} else {
										//this is *not* the last key
										valValues += `${key} = ` + "$" + valDollarIncrement + ", ";
										valArray.push(values[key]);
										valDollarIncrement++;
									}
								}
							} else {
								valValues = `${keysArr[0]} = ` + "$" + valDollarIncrement;
								valArray.push(values[keysArr[0]]);
								valDollarIncrement++;
							}
							
							
							//var query = `INSERT INTO ${table}(${cols}) VALUES (${valCases});`;
							if (typeof(cases) == "object" && !Array.isArray(cases)) {
								this.pool.connect((err, client, release) => {
									if (err) {
										return console.error('Error acquiring client', err.stack)
									}
									var query = `UPDATE ${table} SET ${valValues} WHERE ${valCases}`
									if (globals.consoleLog) { console.log(`[INFO ${fName}]`, valArray, valValues, valCases)
									console.log(`[INFO ${fName}]`, query) }
									client.query(query, valArray, (err, res) => {
										if (err) {
											//err writing to db
											release()
											reject(err)
										}
										//item written to db
										release()
										resolve(res)
									})
								})
								
								
							} else {
								this.pool.connect((err, client, release) => {
									if (err) {
										return console.error('Error acquiring client', err.stack)
									}
									var query = `UPDATE ${table} SET ${valValues}`
									if (globals.consoleLog) { console.log(`[INFO ${fName}]`, valArray, valValues)
									console.log(`[INFO ${fName}]`, query) }
									client.query(query, valArray, (err, res) => {
										if (err) {
											//err writing to db
											release()
											reject(err)
										}
										//item written to db
										release()
										resolve(res)
									})
								})
								
								
							}
						} else {
							reject(`[ERR: ${fName}] Second argument must be of type 'object', got '${typeof(values)}'.`)
						}
					} else {
						reject(`[ERR: ${fName}] First argument must be of type 'string', got '${typeof(table)}'.`)
					}
				} catch (err) {
					reject(err)
				}
			});
		}
		increment(table, values, inc, cases, opArray) {
			return new Promise((resolve, reject) => {
				try {
					var fName = "db.increment";
					//object keys will become columns, object values will be written to those columns
					//make sure <object> is an actual object
					if (table && typeof(table) == "string") {
						if (values && typeof(values) == "string") {
							if (inc && typeof(inc) == "number") {
								var oaIncrement = 0;
								var valDollarIncrement = 1;
								var valArray = [];
								var valCases = "";
								var valValues = "";
								
								if (typeof(cases) == "object" && !Array.isArray(cases)) {
									//cases is set
									var casesArr = Object.keys(cases);
									if (casesArr.length > 1) {
										//iterate through all keys
										for (var ncase of casesArr) {
											if (ncase == casesArr[casesArr.length-1]) {
												//this is the last ncase
												if (opArray) {
													if (Array.isArray(opArray)) {
														//an operator array was passed, and it is actually an array
														if (typeof(opArray[oaIncrement]) == "string") {
															valCases += `${ncase} ${opArray[oaIncrement]} ` + "$" + valDollarIncrement;
															valArray.push(cases[ncase]);
															valDollarIncrement++;
															oaIncrement++;
														} else {
															//all opArray items must be string
															reject(`[ERR: ${fName}] All values in third argument array must be string.`);
														}
													} else {
														//opArray must be array
														reject(`[ERR: ${fName}] If fourth argument is used, it must be an array. Got '${typeof(opArray)}'.`);
													}
												} else {
													//no opArray was passed at all, or it was falsy
													valCases += `${ncase} = ` + "$" + valDollarIncrement;
													valArray.push(cases[ncase]);
													valDollarIncrement++;
												}
											} else {
												//this is *not* the last ncase
												if (opArray) {
													if (Array.isArray(opArray)) {
														//an operator array was passed, and it is actually an array
														if (typeof(opArray[oaIncrement]) == "string") {
															valCases += `${ncase} ${opArray[oaIncrement]} ` + "$" + valDollarIncrement + " AND ";
															valArray.push(cases[ncase]);
															valDollarIncrement++;
															oaIncrement++;
														} else {
															//all opArray items must be string
															reject(`[ERR: ${fName}] All values in third argument array must be string.`);
														}
													} else {
														//opArray must be array
														reject(`[ERR: ${fName}] If fourth argument is used, it must be an array. Got '${typeof(opArray)}'.`);
													}
												} else {
													//no opArray was passed at all, or it was falsy
													valCases += `${ncase} = ` + "$" + valDollarIncrement + " AND ";
													valArray.push(cases[ncase]);
													valDollarIncrement++;
													
												}
											}
										}
									} else {
										//only one ncase, no need to loop
										if (opArray && Array.isArray(opArray)) {
											valCases = `${casesArr[0]} ${opArray[0]} ` + "$" + valDollarIncrement;
											valArray.push(cases[casesArr[0]]);
											valDollarIncrement++;
										} else {
											valCases = `${casesArr[0]} = ` + "$" + valDollarIncrement;
											valArray.push(cases[casesArr[0]]);
											valDollarIncrement++;
										}
									}
								}
								
								//var query = `INSERT INTO ${table}(${cols}) VALUES (${valCases});`;
								if (typeof(cases) == "object" && !Array.isArray(cases)) {
									this.pool.connect((err, client, release) => {
										if (err) {
											return console.error('Error acquiring client', err.stack)
										}
										var query = `UPDATE ${table} SET ${values} = ${values} + ${inc} WHERE ${valCases};`
										if (globals.consoleLog) { console.log(`[INFO ${fName}]`, valArray, valCases)
										console.log(`[INFO ${fName}]`, query) }
										client.query(query, valArray, (err, res) => {
											if (err) {
												//err writing to db
												release()
												reject(err)
											}
											//item written to db
											release()
											resolve(res)
										})
									})
									
									
								} else {
									this.pool.connect((err, client, release) => {
										if (err) {
											return console.error('Error acquiring client', err.stack)
										}
										var query = `UPDATE ${table} SET ${values} = ${values} + ${inc};`
										if (globals.consoleLog) { console.log(`[INFO ${fName}]`, valArray)
										console.log(`[INFO ${fName}]`, query) }
										client.query(query, valArray, (err, res) => {
											if (err) {
												//err writing to db
												release()
												reject(err)
											}
											//item written to db
											release()
											resolve(res)
										})
									})
									
									
								}
							} else {
								reject(`[ERR: ${fName}] Third argument must be of type 'number', got '${typeof(inc)}'.`)
							}
						} else {
							reject(`[ERR: ${fName}] Second argument must be of type 'string', got '${typeof(values)}'.`)
						}
					} else {
						reject(`[ERR: ${fName}] First argument must be of type 'string', got '${typeof(table)}'.`)
					}
				} catch (err) {
					reject(err)
				}
			});
		}
		logRequest(ip, ipInfo, path) {
			return new Promise((resolve, reject) => {
				//console.log(ip, ipInfo, path)
				//check if ip exists in DB at path
				this.selectCols("uniquevisitors", "uvid", {ip})
				.then((resp) => {
					if (resp.rows.length > 0) {
						//unique visitor exists, get requestlogs
							if (resp.rows.length > 0) {
								//request for user and path exists, update request counts
								this.insert("requestlogs", {ip, path})
								.then((resp) => {
									
									this.increment("uniquevisitors", "reqs", 1, {ip})
									.then((resp) => {
										resolve(resp)
									})
									.catch((err) => {
										reject(err)
									})
								})
								.catch((err) => {
									reject(err)
								})
							} else {
								//request for user and path does NOT exist, write a new record
								db.insert("requestlogs", {ip, path})
								.then((resp) => {
									resolve(resp)
								})
								.catch((err) => {
									reject(err)
								})
							}
					} else {
						//unique visitor doesnt exist, make it
						module.exports.insert("uniquevisitors", {ip, ipInfo: JSON.stringify(ipInfo)})
						.then((resp) => {
							module.exports.insert("requestlogs", {ip, path})
							.then((resp) => {
								resolve(resp)
							})
							.catch((err) => {
								reject(err)
							})
						})
						.catch((err) => {
							reject(err)
						})
					}
				})
				.catch((err) => {
					reject(err)
				})
			})
		}
		primKeyInfo(opts) {
			return new Promise((resolve, reject) => {
				//this heals numeric primary key sequences when they error irrationally after things like backup-loads
				var defaults = {
					schema: "public",
				}
				var options = {
					...defaults,
					...opts
				}

				// Step 1) Get the primary key of the requested table
				/*
				var query = `
				SELECT a.attname
				FROM   pg_index i
				JOIN   pg_attribute a ON a.attrelid = i.indrelid
									AND a.attnum = ANY(i.indkey)
				WHERE  i.indrelid = '${options.schema}.${options.table}'::regclass
				AND    i.indisprimary;
				`*/

				//var query = `SELECT MAX(id) FROM public.semantics;`
				var query = `SELECT nextval('public."semantics_id_seq"');`
				console.log(query)
				dbQuery(this.pool, query)
				.then((queryRes) => {
					// Step 2) Check max of the prom key in the table 

					resolve(queryRes)
				})
				.catch((err) => {
					//Error getting the primary key of the requested table
					reject(err)
				})
			})
		}
		healPrimKeys(opts) {
			return new Promise((resolve, reject) => {
				//this heals numeric primary key sequences when they error irrationally after things like backup-loads
				var defaults = {
					schema: "public",
				}
				var options = {
					...defaults,
					...opts
				}

				// Step 1) Get the primary key of the requested table
				var query = `SELECT string_agg(a.attname, ', ') AS pk
								FROM
									pg_constraint AS c
									CROSS JOIN LATERAL UNNEST(c.conkey) AS cols(colnum) -- conkey is a list of the columns of the constraint; so we split it into rows so that we can join all column numbers onto their names in pg_attribute
									INNER JOIN pg_attribute AS a ON a.attrelid = c.conrelid AND cols.colnum = a.attnum
								WHERE
									c.contype = 'p' -- p = primary key constraint
									AND c.conrelid = '${options.schema}.${options.table}'::REGCLASS;`
				
				console.log(query)
				dbQuery(this.pool, query)
				.then((DBprimKey) => {
					var primKey = DBprimKey.rows[0].pk

						// Step 2) Check max number in <prim key> column of the table
						dbQuery(this.pool, `SELECT MAX(${primKey}) FROM ${options.schema}.${options.table};`)
						.then((queryRes) => {
							var maxKey = queryRes.rows[0].max
							// Step 3) Check the current next number to be used as <prim key>
							dbQuery(this.pool, `SELECT nextval('${options.schema}."${options.table}_${primKey}_seq"');`)
							.then((queryRes) => {
								var nextKeyVal = queryRes.rows[0].nextval
								var cleanNeeded = (!(parseInt(maxKey) === parseInt(nextKeyVal) - 1)) //boolean
								// Step 4) The next primkey number should be one higher than the max value,
								// 	if it is not, set the next key value to the current max number, so the next value will be the next number after the following query increments it
								//if (cleanNeeded) {
								if (true) {
									//primkey number is not 1 higher, fix this
									//var newNext = parseInt(maxKey) + 1 //this is un-needed because the heal function increments the key
									dbQuery(this.pool, `SELECT setval('${options.schema}."${options.table}_${primKey}_seq"', ${parseInt(maxKey)});`)
									.then((queryRes) => {
										console.log(queryRes.rows)
										resolve({ cleanNeeded, schema: options.schema, table: options.table, maxKey, nextKeyVal })
									})
									.catch((err) => {
										//Error getting the primary key of the requested table
										reject(err)
									})

								} else {
									//primkey number
									resolve({ cleanNeeded, schema: options.schema, table: options.table, maxKey, nextKeyVal })
								}
							})
							.catch((err) => {
								//Error getting the primary key of the requested table
								reject(err)
							})
						})
						.catch((err) => {
							//Error getting the primary key of the requested table
							reject(err)
						})
					
				})
				.catch((err) => {
					//Error getting the primary key of the requested table
					reject(err)
				})
			})
		}
	},
};


function processCases(cases, opArray) {
    return new Promise((resolve, reject) => {
        var oaIncrement = 0;
        var valDollarIncrement = 1;
        var valArray = [];
        var valCases = "";

        if (typeof(cases) == "object" && !Array.isArray(cases)) {
            var casesArr = Object.keys(cases);
            if (casesArr.length > 1) {
                //iterate through all keys
                for (var ncase of casesArr) {
                    if (ncase == casesArr[casesArr.length-1]) {
                        //this is the last ncase
                        if (opArray) {
                            if (Array.isArray(opArray)) {
                                //an operator array was passed, and it is actually an array
                                if (typeof(opArray[oaIncrement]) == "string") {
                                    valCases += `${ncase} ${opArray[oaIncrement]} ` + "$" + valDollarIncrement;
                                    valArray.push(cases[ncase]);
                                    valDollarIncrement++;
                                    oaIncrement++;
                                } else {
                                    //all opArray items must be string
                                    reject(`[ERR: ${fName}] All values in third argument array must be string.`);
                                }
                            } else {
                                //opArray must be array
                                reject(`[ERR: ${fName}] If third argument is used, it must be an array. Got '${typeof(opArray)}'.`);
                            }
                        } else {
                            //no opArray was passed at all, or it was falsy
                            valCases += `${ncase} = ` + "$" + valDollarIncrement;
                            valArray.push(cases[ncase]);
                            valDollarIncrement++;
                        }
                    } else {
                        //this is *not* the last ncase
                        if (opArray) {
                            if (Array.isArray(opArray)) {
                                //an operator array was passed, and it is actually an array
                                if (typeof(opArray[oaIncrement]) == "string") {
                                    valCases += `${ncase} ${opArray[oaIncrement]} ` + "$" + valDollarIncrement + " AND ";
                                    valArray.push(cases[ncase]);
                                    valDollarIncrement++;
                                    oaIncrement++;
                                } else {
                                    //all opArray items must be string
                                    reject(`[ERR: ${fName}] All values in third argument array must be string.`);
                                }
                            } else {
                                //opArray must be array
                                reject(`[ERR: ${fName}] If third argument is used, it must be an array. Got '${typeof(opArray)}'.`);
                            }
                        } else {
                            //no opArray was passed at all, or it was falsy
                            valCases += `${ncase} = ` + "$" + valDollarIncrement + " AND ";
                            valArray.push(cases[ncase]);
                            valDollarIncrement++;
                            
                        }
                    }
                }
            } else {
                //only one ncase, no need to loop
                if (opArray && Array.isArray(opArray)) {
                    valCases = `${casesArr[0]} ${opArray[0]} ` + "$1";
                    valArray.push(cases[casesArr[0]]);
                } else {
                    valCases = `${casesArr[0]} = ` + "$1";
                    valArray.push(cases[casesArr[0]]);
                }
            }

			resolve({doCases: true, valArray, valCases})

        } else {
            resolve({doCases: false})
        }
    }) 
}

function dbQuery(pool, query, valArray) {
    return new Promise((resolve, reject) => {
        pool.connect((err, client, release) => {
            if (err) {
                return console.error('Error acquiring client', err.stack)
            }
            if (valArray) {
                //an array of values was passed, which needs to be sent to the database
                client.query(query, valArray, (err, res) => {
                    if (err) {
                        //err writing to db
                        release()
                        reject(err)
                    } else {
                        //item written to db
                        release()
                        resolve(res)
                    }
                    
                })
            } else {
                //no values were passed, this request has no selection 
                client.query(query, (err, res) => {
                    if (err) {
                        //err writing to db
                        release()
                        reject(err)
                    } else {
                        //item written to db
                        release()
                        resolve(res)
                    }
                    
                })
            }
            
        })
    })
}