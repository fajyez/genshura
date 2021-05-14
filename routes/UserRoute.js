const { Router } = require('express')
const { check, validationResult } = require('express-validator')
const bcrypt = require('bcrypt')
const config = require('config')
const jwt = require('jsonwebtoken')
const { Client, client } = require('../database/database')

const router = new Router()

// Регистрация 
// @POST /api/users/register
router.post('/register', 
[
    check('username')
    .notEmpty().withMessage('Укажите имя пользователя!')
    .isLength({min: 5, max: 25}).withMessage('Длина ника может содержать от 5 до 25 символов!')
    .isAlphanumeric('en-US').withMessage('Имя пользователя может содержать только латинские буквы и цифры!'),

    check('email')
    .notEmpty().withMessage('Введите Email')
    .normalizeEmail()
    .isEmail().withMessage('Укажите корректный Email'),

    check('password')
    .notEmpty().withMessage('Укажите пароль!')
    .isLength({min: 8}).withMessage('Минимальная длина пароля - 8 смиволов!')

], 
async (req, res) => {
    try {
        const errors = validationResult(req)
        
        if(!errors.isEmpty) {
            return res.status(400).json({errors: errors.array()}) 
        }

        const {email, username, password} = req.body

        // Проверка имени пользователя
        const checkUserName = await client.query(`SELECT COUNT(*) FROM users WHERE username=$1`, [username]) // Вай, прямые запросы, но ладно :)
        const isUserExists = checkUserName.rows[0].count == 0

        if (!isUserExists) {
            return res.status(400).json({msg: 'Пользователь с таким логином уже существует!'})
        }

        // Проверка Email на занятость
        const checkUserEmail = await client.query(`SELECT COUNT(*) FROM users WHERE email=$1`, [email]) // Вай, прямые запросы, но ладно :)
        const isEmailExists = checkUserEmail.rows[0].count != 0 


        if (isEmailExists) {
            return res.status(400).json({msg: 'Данный Email уже зарегистрирован!'})
        }  

        // Соль для пароля 
        const salt = await bcrypt.genSalt(10)
        const hashedPass = await bcrypt.hash(password, salt)


        try {
            await client.query('BEGIN')

            const insertUser = `INSERT INTO users VALUES(DEFAULT, $1, $2, $3, 1, CURRENT_DATE, CURRENT_DATE) RETURNING user_id`
            const result = await client.query(insertUser, [email, hashedPass, username])

            const insertCash = `INSERT INTO cash VALUES(DEFAULT, $1, DEFAULT)`
            await client.query(insertCash, [result.rows[0].user_id])

            await client.query('COMMIT')

            res.status(200).json({msg: 'Регистрация завершена'})
        } catch (e) {
            console.log(e)
            await client.query("ROLLBACK")
            throw e
        }
    } catch (err) {
        console.log(err)
        res.status(500).json({msg: 'Ошибка сервера!'})
    }
})

// Авторизация 
// @POST /api/users/auth
router.post('/auth', 
[
    check('email')
    .notEmpty().withMessage("Укажите Email")
    .normalizeEmail()
    .isEmail().withMessage("Введите корректный Email"),

    check('password')
    .notEmpty().withMessage("Введите пароль")
    .isLength({min: 8}).withMessage("Минимальная длина пароля 8 символов")
],
async (req, res) => {

    try {
        const errors = validationResult(req)
        
        if(!errors.isEmpty) {
            return res.status(400).json({errors: errors.array()}) 
        }

        const {email, password} = req.body
        
        const checkUserEmail = await client.query(`SELECT COUNT(*) FROM users WHERE email=$1`, [email]) // Вай, прямые запросы, но ладно :)
        const isEmailExists = checkUserEmail.rows[0].count != 0 

        if (!isEmailExists) {
            return res.status(400).json({msg: 'Пользователь не найден!'})
        }  

        // Получаем пароль из бд
        const userDataQuery = await client.query("SELECT user_id, username, password FROM Users WHERE email=$1", [email])
        const userData = userDataQuery.rows[0]

        // Сверямем пароли
        const isMatch = await bcrypt.compare(password, userData.password)

        if (!isMatch) {
            return res.statsu(400).json({msg: 'Неверный пароль!'})
        }

        const token = jwt.sign(
            {UserId: userData.user_id},
            config.get('JWT_SECRET'),
            {expiresIn: '1h'}
        )

        const now = Date.now().toString().split(' ')[0]

        client.query('UPDATE Users SET last_login = $1 WHERE user_id = $2', [now, userData.user_id])

        res.json({token, userId: userData.user_id})
    } catch (err) {
        res.statsus(500).json('Ошибка сервера!')
    }
}
)


// @GET /api/users/:id
router.get('/:id', async (res, req) => {
    
    const userId = req.params.userId

    const getUserQuery = 'SELECT username, avatar, reg_date, last_login, FROM users WHERE user_id = $1'
    const result = await client.query(getUserQuery, [userId])

    res.json({user: result.rows[0]})

})

module.exports = router

