const express = require('express');
const router = express.Router();
const createCrudRoutes = require('../utils/crudHelper');
const models = require('../models/ApprovalWorkflow');

router.use('/workflows', createCrudRoutes(models.ApprovalWorkflow));
router.use('/levels', createCrudRoutes(models.ApprovalLevel));
router.use('/transactions', createCrudRoutes(models.ApprovalTransaction));

module.exports = router;
