const assert = require("chai").assert
var expect = require('chai').expect;

const {Adrauth} = require('../../adrauth.js')
const fs = require('node:fs');

var adrauth = null

describe("Database Connection", () => {
    it("should successfully connect to postgres database with supplied config/creds.json", () => {
        //test connection to postgres database
        var connect = JSON.parse(fs.readFileSync("config/creds.json"))
        assert.typeOf( connect, "object" )

        adrauth = new Adrauth({ mode: 'postgres', connect }, (err, resp) => {
            //assert.isUndefined( err )
            //assert.equal( (err == null), true )
            assert.equal( err, null )
            assert.equal( resp, "DBLink created" )
        })
    })
})

describe("Select Operations", () => {
    it("should select all items in a given table", () => {
        //test database select all
        return adrauth.db.selectAll("books")
        .then((res) => {
            assert.typeOf( res, "object" )
            assert.isArray( res.rows )
            
        })
        .catch(err => {
            console.error(err)
        })
    })
    it("should select all items within specific columns in a given table", () => {
        //test database select cols
        return adrauth.db.selectCols("books", "urltitle, title")
        .then((res) => {
            assert.typeOf( res, "object" )
            assert.isArray( res.rows )
        })
        .catch(err => {
            console.error(err)
        })
    })
    it("should select *specific* items within specific columns in a given table", () => {
        //test database select cols
        return adrauth.db.selectCols("books", "urltitle, title", {author: 'By Bristol Loren'})
        .then((res) => {
            assert.typeOf( res, "object" )
            assert.isArray( res.rows )
        })
        .catch(err => {
            console.error(err)
        })
    })
})

describe("Maintenance Operations", () => {
    it("should heal the primary key series in a given table, by setting the next primkey number to the <max> number in the primary key column", () => {
        //test heal primKey sequence
        return adrauth.db.healPrimKeys({table: "books"})
        .then((res) => {
            console.log(res)
            assert.typeOf( res, "object" )

        })
        .catch(err => {
            console.error(err)
        })
    })
})

describe("Insert and modify operations", () => {
    it("should successfully insert a record into a specified table", () => {
        //test database insert
        return adrauth.db.insert("semantics", {name: "testSem", val: "I work well!"})
        .then((res) => {
            assert.typeOf( res, "object" )
            assert.isArray( res.rows )
            
        })
        .catch(err => {
            console.error(err)
        })
    })
    it("should successfully delete a record from a specified table", () => {
        //test database insert
        return adrauth.db.delete("semantics", {name: "testSem"})
        .then((res) => {
            assert.typeOf( res, "object" )
            assert.isArray( res.rows )
            
        })
        .catch(err => {
            console.error(err)
        })
    })
})