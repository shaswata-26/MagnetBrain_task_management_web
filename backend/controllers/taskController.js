const Task = require('../models/Task');

exports.createTask = async (req, res) => {
  try {
    const { title, description, dueDate, priority, assignedTo } = req.body;

    const task = new Task({
      title,
      description,
      dueDate,
      priority,
      createdBy: req.user.id,
      assignedTo: assignedTo || req.user.id
    });

    await task.save();
    await task.populate('assignedTo', 'username email');
    await task.populate('createdBy', 'username email');

    res.status(201).json({
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getTasks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    
    // Filter by assigned user or created by user based on role
    if (req.user.role === 'admin') {
      if (req.query.assignedTo) {
        filter.assignedTo = req.query.assignedTo;
      }
    } else {
      filter.$or = [
        { assignedTo: req.user.id },
        { createdBy: req.user.id }
      ];
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.priority) {
      filter.priority = req.query.priority;
    }

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'username email')
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Task.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      tasks,
      pagination: {
        current: page,
        total: totalPages,
        count: tasks.length,
        totalRecords: total
      }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'username email')
      .populate('createdBy', 'username email');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to this task
    if (req.user.role !== 'admin' && 
        task.assignedTo._id.toString() !== req.user.id && 
        task.createdBy._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(task);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid task ID' });
    }
    console.error('Get task error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && task.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { title, description, dueDate, priority, status, assignedTo } = req.body;

    // Update task fields
    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (dueDate) task.dueDate = dueDate;
    if (priority) task.priority = priority;
    if (status) task.status = status;
    if (assignedTo) task.assignedTo = assignedTo;

    await task.save();
    await task.populate('assignedTo', 'username email');
    await task.populate('createdBy', 'username email');

    res.json({
      message: 'Task updated successfully',
      task
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid task ID' });
    }
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && task.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid task ID' });
    }
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user is assigned to this task or is admin/creator
    if (req.user.role !== 'admin' && 
        task.assignedTo.toString() !== req.user.id && 
        task.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    task.status = status;
    await task.save();
    await task.populate('assignedTo', 'username email');
    await task.populate('createdBy', 'username email');

    res.json({
      message: 'Task status updated successfully',
      task
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid task ID' });
    }
    console.error('Update task status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateTaskPriority = async (req, res) => {
  try {
    const { priority } = req.body;
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && task.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    task.priority = priority;
    await task.save();
    await task.populate('assignedTo', 'username email');
    await task.populate('createdBy', 'username email');

    res.json({
      message: 'Task priority updated successfully',
      task
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid task ID' });
    }
    console.error('Update task priority error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getUserTasks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { assignedTo: req.user.id };
    
    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.priority) {
      filter.priority = req.query.priority;
    }

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'username email')
      .populate('createdBy', 'username email')
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Task.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      tasks,
      pagination: {
        current: page,
        total: totalPages,
        count: tasks.length,
        totalRecords: total
      }
    });
  } catch (error) {
    console.error('Get user tasks error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};