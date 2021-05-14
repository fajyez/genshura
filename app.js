const config = require('config')
const { connect } = require('./database/database')
const express = require('express')

const app = express()

connect()

app.use(express.json({ extended: false}))
app.use('/api/users', require('./routes/UserRoute'))
app.use('/api/cash', require('./routes/cashRoute'))

const PORT = config.get("PORT") || 3000

app.listen(PORT, () => {console.log(`Server was started on port ${PORT}`)})