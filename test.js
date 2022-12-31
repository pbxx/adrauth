const {Adrauth} = require('./adrauth.js')
const fs = require('node:fs')

//test connection to postgres database
var connect = JSON.parse(fs.readFileSync("config/creds.json"))
//console.log(connect)
var adrauth = new Adrauth({ mode: 'postgres', connect }, (err, resp) => {
    
    if (err) {
        console.log(err)
    } else {
        console.log(resp)
        console.log(`Database connected!`)
        
    }
})

//test database select
adrauth.db.selectAll("semantics", {name: 'openenroll'})
.then((res) => {
    console.log("test database select:")
    console.log(res.rows)
})
.catch(err => {
    console.error(err)
})

//test database select all
adrauth.db.selectAll("semantics")
.then((res) => {
    console.log("test database select all:")
    console.log(res.rows)
})
.catch(err => {
    console.error(err)
})

//test getting table primKeyInfo
/*
adrauth.db.primKeyInfo({table: "tokens"})
.then((res) => {
    console.log("test getting table primKeyInfo:")
    console.log(res.rows)
})
.catch(err => {
    console.error(err)
})*/

//test heal primKey sequence
adrauth.db.healPrimKeys({table: "semantics"})
.then((res) => {
    console.log("test heal primKey sequence:")
    console.log(res)

    //test database insert
    adrauth.db.insert("semantics", {name: "testSem", val: "I work well!"})
    .then((res) => {
        console.log("test database insert:")
        console.log(res.rows)
        //test database delete
        adrauth.db.delete("semantics", {name: "testSem"})
        .then((res) => {
            console.log("test database delete:")
            console.log(res.rows)
        })
        .catch(err => {
            console.error(err)
        })
    })
    .catch(err => {
        console.error(err)
    })

})
.catch(err => {
    console.error(err)
})

