/**
 * Dashboard Page Component
 * Main admin dashboard showing all forms
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import formService from '../../services/formService';
import responseService from '../../services/responseService';
import './Dashboard.css';

const Dashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, active, inactive
    const [counts, setCounts] = useState({});

    useEffect(() => {
        loadForms();
    }, [filter]);

    const loadForms = async () => {
        try {
            setLoading(true);
            const filters = {};
            if (filter === 'active') {
                filters.is_active = true;
            } else if (filter === 'inactive') {
                filters.is_active = false;
            }
            const response = await formService.getAllForms(filters);
            
            if (response.success) {
                // Ensure sections is always an array
                const formsData = (response.data.forms || []).map(form => ({
                    ...form,
                    sections: Array.isArray(form.sections) ? form.sections : []
                }));
                setForms(formsData);

                // Fetch real-time response counts in parallel
                const countEntries = await Promise.all(
                    formsData.map(async (f) => {
                        try {
                            const res = await responseService.getResponseCount(f.form_id);
                            return [f.form_id, res.data?.count ?? res.data ?? 0];
                        } catch { return [f.form_id, f.response_count || 0]; }
                    })
                );
                setCounts(Object.fromEntries(countEntries));
            }
        } catch (error) {
            toast.error('Failed to load forms');
            console.error('Load forms error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateForm = () => {
        navigate('/forms/create');
    };

    const handleViewForm = (formId) => {
        navigate(`/forms/${formId}`);
    };

    const handleEditForm = (formId) => {
        navigate(`/forms/${formId}/edit`);
    };

    const handleViewResponses = (formId) => {
        navigate(`/forms/${formId}/responses`);
    };

    const handleViewAnalysis = (formId) => {
        navigate(`/forms/${formId}/analysis`);
    };

    const handleDuplicateForm = async (formId) => {
        try {
            const response = await formService.duplicateForm(formId);
            if (response.success) {
                toast.success('Form duplicated successfully');
                loadForms();
            }
        } catch (error) {
            toast.error('Failed to duplicate form');
        }
    };

    const handleCopyLink = (formId) => {
        const formUrl = `${window.location.origin}/form/${formId}`;
        navigator.clipboard.writeText(formUrl).then(() => {
            toast.success('Form link copied to clipboard!');
        }).catch(() => {
            toast.error('Failed to copy link');
        });
    };

    const handleDeleteForm = async (formId) => {
        if (!window.confirm('Are you sure you want to delete this form?')) {
            return;
        }

        try {
            const response = await formService.deleteForm(formId);
            if (response.success) {
                toast.success('Form deleted successfully');
                loadForms();
            }
        } catch (error) {
            toast.error('Failed to delete form');
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleToggleStatus = async (form) => {
        // If currently active → close it; if closed/draft → activate it
        const newStatus = form.is_active ? 'closed' : 'active';
        const label = newStatus === 'active' ? 'opened' : 'closed';
        try {
            const response = await formService.changeFormStatus(form.form_id, newStatus);
            if (response.success) {
                toast.success(`Form ${label} successfully`);
                loadForms();
            }
        } catch (error) {
            toast.error(`Failed to ${newStatus === 'active' ? 'open' : 'close'} form`);
        }
    };

    const handleDeleteResponses = async (formId) => {
        if (!window.confirm('Delete ALL responses for this form? This cannot be undone.')) return;
        try {
            const response = await responseService.deleteAllResponses(formId);
            if (response.success) {
                toast.success('All responses deleted');
                setCounts(prev => ({ ...prev, [formId]: 0 }));
            }
        } catch (error) {
            toast.error('Failed to delete responses');
        }
    };

    const getStatusBadge = (isActive, publishedAt) => {
        if (isActive && publishedAt) {
            return { text: 'Active', class: 'badge-active' };
        } else if (!isActive && publishedAt) {
            return { text: 'Closed', class: 'badge-closed' };
        } else {
            return { text: 'Draft', class: 'badge-draft' };
        }
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-left">
                    <h1>Feedback System</h1>
                    <p>Welcome back, {user?.name}!</p>
                </div>
                <div className="header-right">
                    <button onClick={handleLogout} className="btn-logout">
                        Logout
                    </button>
                </div>
            </header>

            <div className="dashboard-content">
                <div className="content-header">
                    <h2>My Forms</h2>
                    <button onClick={handleCreateForm} className="btn-create">
                        + Create New Form
                    </button>
                </div>

                <div className="filter-tabs">
                    <button
                        className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All Forms
                    </button>
                    <button
                        className={`filter-tab ${filter === 'active' ? 'active' : ''}`}
                        onClick={() => setFilter('active')}
                    >
                        Active
                    </button>
                    <button
                        className={`filter-tab ${filter === 'inactive' ? 'active' : ''}`}
                        onClick={() => setFilter('inactive')}
                    >
                        Inactive
                    </button>
                </div>

                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading forms...</p>
                    </div>
                ) : forms.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <h3>No forms found</h3>
                        <p>Create your first form to get started</p>
                        <button onClick={handleCreateForm} className="btn-create">
                            Create Form
                        </button>
                    </div>
                ) : (
                    <div className="forms-grid">
                        {forms.map(form => {
                            const badge = getStatusBadge(form.is_active, form.published_at);
                            return (
                                <div key={form.form_id} className="form-card">
                                    <div className="form-card-header">
                                        <h3>{form.title}</h3>
                                        <span className={`badge ${badge.class}`}>
                                            {badge.text}
                                        </span>
                                    </div>
                                    
                                    <p className="form-description">
                                        {form.description || 'No description'}
                                    </p>

                                    <div className="form-stats">
                                        <div className="stat">
                                            <span className="stat-value">{counts[form.form_id] ?? form.total_responses ?? 0}</span>
                                            <span className="stat-label">Responses</span>
                                        </div>
                                        <div className="stat">
                                            <span className="stat-value">{form.sections?.length || 0}</span>
                                            <span className="stat-label">Sections</span>
                                        </div>
                                    </div>

                                    <div className="form-actions">
                                        <button 
                                            onClick={() => handleViewForm(form.form_id)}
                                            className="btn-action btn-view"
                                        >
                                            View
                                        </button>
                                        <button 
                                            onClick={() => handleEditForm(form.form_id)}
                                            className="btn-action btn-edit"
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            onClick={() => handleCopyLink(form.form_id)}
                                            className="btn-action btn-share"
                                            title="Copy form link to share with students"
                                        >
                                            🔗 Share
                                        </button>
                                        <button 
                                            onClick={() => handleViewResponses(form.form_id)}
                                            className="btn-action btn-responses"
                                        >
                                            Responses
                                        </button>
                                        <button 
                                            onClick={() => handleViewAnalysis(form.form_id)}
                                            className="btn-action btn-analysis"
                                        >
                                            Analysis
                                        </button>
                                    </div>

                                    <div className="form-card-footer">
                                        <button 
                                            onClick={() => handleToggleStatus(form)}
                                            className={`btn-icon ${form.is_active ? 'btn-close-form' : 'btn-open-form'}`}
                                            title={form.is_active ? 'Close form (stop accepting responses)' : 'Open form (start accepting responses)'}
                                        >
                                            {form.is_active ? '🔒 Close' : '🔓 Open'}
                                        </button>
                                        <button 
                                            onClick={() => handleDuplicateForm(form.form_id)}
                                            className="btn-icon"
                                            title="Duplicate"
                                        >
                                            📋
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteResponses(form.form_id)}
                                            className="btn-icon btn-del-responses"
                                            title="Delete all responses"
                                        >
                                            🗑️ Responses
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteForm(form.form_id)}
                                            className="btn-icon btn-delete"
                                            title="Delete form"
                                        >
                                            ✕ Form
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
