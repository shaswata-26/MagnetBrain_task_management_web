import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { taskService } from '../../services/taskService';
import {
    CheckCircleIcon,
    ClockIcon,
    PlayCircleIcon,
    TrashIcon,
    PencilSquareIcon,
    EyeIcon,
    UserCircleIcon
} from '@heroicons/react/24/outline';

const TaskCard = ({ task, onUpdate, onDelete }) => {
    const { user } = useAuth();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return 'bg-red-100 text-red-800 border-red-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800 border-green-200';
            case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <CheckCircleIcon className="w-4 h-4" />;
            case 'in-progress': return <PlayCircleIcon className="w-4 h-4" />;
            case 'pending': return <ClockIcon className="w-4 h-4" />;
            default: return <ClockIcon className="w-4 h-4" />;
        }
    };

    const handleStatusChange = async (newStatus) => {
        setIsUpdating(true);
        try {
            await taskService.updateTaskStatus(task._id, newStatus);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update task status');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            setIsDeleting(true);
            try {
                await taskService.deleteTask(task._id);
                if (onDelete) onDelete();
            } catch (error) {
                console.error('Error deleting task:', error);
                alert('Failed to delete task');
            } finally {
                setIsDeleting(false);
            }
        }
    };

    // Always show status dropdown for testing (remove in production)
    const showStatusDropdown = true;

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
            {/* Priority Indicator */}
            <div className={`h-1 rounded-t-lg ${task.priority === 'high' ? 'bg-red-500' :
                task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                }`}></div>

            <div className="p-4">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                        {task.title}
                    </h3>
                    <div className="flex space-x-2 flex-shrink-0 ml-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                            {getStatusIcon(task.status)}
                            <span className="ml-1">{task.status}</span>
                        </span>
                    </div>
                </div>

                {/* Description */}
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {task.description || 'No description provided'}
                </p>

                {/* Meta Information */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                    <div className="flex items-center">
                        <ClockIcon className="w-4 h-4 mr-1" />
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center">
                        <UserCircleIcon className="w-4 h-4 mr-1" />
                        {task.assignedTo?._id === user?.id ? 'You' : task.assignedTo?.username || 'Unassigned'}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center">
                    {/* Status Dropdown - Always visible for testing */}
                    {showStatusDropdown && (
                        <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            disabled={isUpdating}
                            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
                        >
                            <option value="pending">Pending</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                        </select>
                    )}

                    <div className="flex space-x-2">
                        <Link
                            to={`/tasks/${task._id}`}
                            className="inline-flex items-center p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-md transition-colors"
                            title="View task"
                        >
                            <EyeIcon className="w-4 h-4" />
                        </Link>

                        <Link
                            to={`/tasks/${task._id}/edit`}
                            className="inline-flex items-center p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-md transition-colors"
                            title="Edit task"
                        >
                            <PencilSquareIcon className="w-4 h-4" />
                        </Link>

                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="inline-flex items-center p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                            title="Delete task"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskCard;