const express = require('express')
const router = express.Router()
const { saveConfig, getConfig, getConfigBySemester } = require('../controllers/configController')
const validate = require('../middleware/validate')
const authMiddleware = require('../middleware/authMiddleware')
const { configSchema } = require('../middleware/schemas')

router.use(authMiddleware)

router.post('/',   validate(configSchema), saveConfig)
router.get('/',    getConfigBySemester)
router.get('/:id', getConfig)

module.exports = router
