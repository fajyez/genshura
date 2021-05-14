const config = require('config')
const { Client } = require('pg')

const client = new Client(config.get("DATABASE"))

const connect = () => {
    client.connect(err => {
        if(err) {
            console.error("Fail connect to database", err.stack)
        } else {
            console.log("Database connected...")
        }
    })
}

module.exports = {client, connect}