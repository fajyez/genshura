const { Router } = require('express')
const config = require('config')
const jwt = require('jsonwebtoken')
const { Client, client } = require('../database/database')

const router = new Router()

// @GET /api/cash/:id
router.get('/:id', async (res, req) => {
    
    const userId = req.params.userId

    const getCashQuery = 'SELECT cash_balance FROM Cash WHERE user_id = $1'
    const result = await client.query(getCashQuery, [userId])

    const money = result.rows[0].cash_balance

    res.json({money})

})

module.exports = router