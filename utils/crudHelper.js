const express = require('express');

const createCrudRoutes = (Model) => {
    const router = express.Router();

    // Create
    router.post('/', async (req, res) => {
        try {
            const item = new Model(req.body);
            await item.save();
            res.status(201).json(item);
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    });

    // Read All with filtering support
    router.get('/', async (req, res) => {
        try {
            const filter = { ...req.query };
            
            // Convert string "null" to actual null for MongoDB queries
            Object.keys(filter).forEach(key => {
                if (filter[key] === 'null') filter[key] = null;
                if (filter[key] === 'true') filter[key] = true;
                if (filter[key] === 'false') filter[key] = false;
            });

            const items = await Model.find(filter).sort({ createdAt: -1 });
            res.json(items);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    });

    // Read One
    router.get('/:id', async (req, res) => {
        try {
            const item = await Model.findById(req.params.id);
            if (!item) return res.status(404).json({ message: 'Not found' });
            res.json(item);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    });

    // Update
    router.put('/:id', async (req, res) => {
        try {
            const item = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
            if (!item) return res.status(404).json({ message: 'Not found' });
            res.json(item);
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    });

    // Delete
    router.delete('/:id', async (req, res) => {
        try {
            const item = await Model.findByIdAndDelete(req.params.id);
            if (!item) return res.status(404).json({ message: 'Not found' });
            res.json({ message: 'Deleted successfully' });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    });

    return router;
};

module.exports = createCrudRoutes;
