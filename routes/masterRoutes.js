const express = require('express');
const router = express.Router();
const createCrudRoutes = require('../utils/crudHelper');

const User = require('../models/User');
const Role = require('../models/Role');
const Department = require('../models/Department');
const Unit = require('../models/Unit');
const Warehouse = require('../models/Warehouse');
const Category = require('../models/Category');
const CostCenter = require('../models/CostCenter');
const Supplier = require('../models/Supplier');

// Register CRUD routes for each master
router.use('/users', createCrudRoutes(User));
router.use('/roles', createCrudRoutes(Role));
router.use('/departments', createCrudRoutes(Department));
router.use('/units', createCrudRoutes(Unit));
router.use('/warehouses', createCrudRoutes(Warehouse));
router.use('/categories', createCrudRoutes(Category));
router.use('/cost-centers', createCrudRoutes(CostCenter));
router.use('/suppliers', createCrudRoutes(Supplier));

module.exports = router;
