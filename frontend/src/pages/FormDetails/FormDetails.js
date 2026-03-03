/**
 * Form Details Page Component
 * Shows full form info including general detail fields/parameters
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import formService from '../../services/formService';
import './FormDetails.css';

const FormDetails = () => {
    const { formId } = useParams();
    const navigate = useNavigate();

    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadForm();
    }, [formId]);

    const loadForm = async () => {
        try {
            setLoading(true);
            const response = await formService.getForm(formId);
            if (response.success && response.data.form) {
                setForm(response.data.form);
            } else {
                toast.error('Form not found');
                navigate('/dashboard');
            }
        } catch (error) {
            toast.error('Failed to load form details');
            navigate('/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (form) => {
        if (form.is_active && form.published_at) return { text: 'Active', cls: 'badge-active' };
        if (!form.is_active && form.published_at) return { text: 'Closed', cls: 'badge-closed' };
        return { text: 'Draft', cls: 'badge-draft' };
    };

    const renderGeneralDetailFields = (fields) => {
        if (!fields || fields.length === 0) {
            return <p className="no-data">No general detail parameters configured.</p>;
        }

        return (
            <div className="gdf-list">
                {fields.map((field, idx) => (
                    <div key={idx} className="gdf-card">
                        <div className="gdf-header">
                            <span className="gdf-name">{field.label || field.name}</span>
                            <span className={`gdf-type-badge type-${field.type}`}>{field.type}</span>
                            {field.required && <span className="gdf-required">Required</span>}
                        </div>

                        {field.name && field.name !== field.label && (
                            <div className="gdf-meta">
                                <span className="meta-label">Field key:</span>
                                <code>{field.name}</code>
                            </div>
                        )}

                        {field.parent_field && (
                            <div className="gdf-meta">
                                <span className="meta-label">Depends on:</span>
                                <code>{field.parent_field}</code>
                            </div>
                        )}

                        {/* Simple dropdown options */}
                        {field.type === 'dropdown' && field.options && field.options.length > 0 && (
                            <div className="gdf-options">
                                <span className="meta-label">Options:</span>
                                <div className="options-pills">
                                    {field.options.map((opt, i) => (
                                        <span key={i} className="option-pill">{opt}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Cascading options */}
                        {field.type === 'cascading' && field.cascading_options && (
                            <div className="gdf-cascading">
                                <span className="meta-label">Cascading options:</span>
                                <table className="cascade-table">
                                    <thead>
                                        <tr>
                                            <th>Parent Value</th>
                                            <th>Child Options</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(field.cascading_options).map(([parent, children], i) => (
                                            <tr key={i}>
                                                <td><strong>{parent}</strong></td>
                                                <td>
                                                    <div className="options-pills">
                                                        {(Array.isArray(children) ? children : []).map((c, j) => (
                                                            <span key={j} className="option-pill">{c}</span>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    const renderSections = (sections) => {
        if (!sections || sections.length === 0) {
            return <p className="no-data">No sections configured.</p>;
        }

        return sections.map((section, idx) => (
            <div key={section.id || idx} className="section-card">
                <div className="section-header">
                    <h4>{section.title || `Section ${idx + 1}`}</h4>
                    {section.scoring_enabled && (
                        <span className="badge-scoring">Scoring Enabled</span>
                    )}
                </div>
                {section.description && (
                    <p className="section-description">{section.description}</p>
                )}
                {section.questions && section.questions.length > 0 ? (
                    <div className="questions-list">
                        {section.questions.map((q, qi) => (
                            <div key={q.id || qi} className="question-item">
                                <span className="q-number">{qi + 1}.</span>
                                <div className="q-content">
                                    <span className="q-text">{q.question_text || q.text}</span>
                                    <span className={`q-type type-${q.question_type || q.type}`}>
                                        {q.question_type || q.type}
                                    </span>
                                    {q.required && <span className="q-required">Required</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="no-data">No questions in this section.</p>
                )}
            </div>
        ));
    };

    if (loading) {
        return (
            <div className="fd-container">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading form details...</p>
                </div>
            </div>
        );
    }

    if (!form) return null;

    const badge = getStatusBadge(form);
    const generalDetailFields = form.settings?.general_detail_fields || [];
    const sections = Array.isArray(form.sections) ? form.sections : [];
    const totalQuestions = sections.reduce((acc, s) => acc + (s.questions?.length || 0), 0);

    return (
        <div className="fd-container">
            {/* Header */}
            <header className="fd-header">
                <button onClick={() => navigate('/dashboard')} className="btn-back">
                    ← Back to Dashboard
                </button>
                <div className="fd-header-actions">
                    <button onClick={() => navigate(`/forms/${formId}/edit`)} className="btn-edit">
                        Edit Form
                    </button>
                    <button onClick={() => navigate(`/forms/${formId}/responses`)} className="btn-responses">
                        View Responses
                    </button>
                    <button onClick={() => navigate(`/forms/${formId}/analysis`)} className="btn-analysis">
                        Analysis
                    </button>
                </div>
            </header>

            <div className="fd-content">
                {/* Form Overview */}
                <section className="fd-section">
                    <div className="form-overview">
                        <div className="form-title-row">
                            <h1>{form.title}</h1>
                            <span className={`badge ${badge.cls}`}>{badge.text}</span>
                        </div>
                        {form.description && (
                            <p className="form-desc">{form.description}</p>
                        )}
                        <div className="form-stats-row">
                            <div className="stat-chip">
                                <span className="stat-value">{form.response_count || 0}</span>
                                <span className="stat-label">Responses</span>
                            </div>
                            <div className="stat-chip">
                                <span className="stat-value">{sections.length}</span>
                                <span className="stat-label">Sections</span>
                            </div>
                            <div className="stat-chip">
                                <span className="stat-value">{totalQuestions}</span>
                                <span className="stat-label">Questions</span>
                            </div>
                            <div className="stat-chip">
                                <span className="stat-value">{generalDetailFields.length}</span>
                                <span className="stat-label">Detail Fields</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* General Detail Fields / Parameters */}
                <section className="fd-section">
                    <h2 className="section-title">
                        General Detail Parameters
                        <span className="count-badge">{generalDetailFields.length}</span>
                    </h2>
                    {renderGeneralDetailFields(generalDetailFields)}
                </section>

                {/* Form Settings */}
                <section className="fd-section">
                    <h2 className="section-title">Form Settings</h2>
                    <div className="settings-grid">
                        <div className="setting-item">
                            <span className="setting-label">Require Email</span>
                            <span className={`setting-value ${form.settings?.require_email ? 'value-yes' : 'value-no'}`}>
                                {form.settings?.require_email ? 'Yes' : 'No'}
                            </span>
                        </div>
                        <div className="setting-item">
                            <span className="setting-label">Prevent Duplicate Responses</span>
                            <span className={`setting-value ${form.settings?.prevent_duplicate ? 'value-yes' : 'value-no'}`}>
                                {form.settings?.prevent_duplicate ? 'Yes' : 'No'}
                            </span>
                        </div>
                        <div className="setting-item">
                            <span className="setting-label">Restrict Domain</span>
                            <span className={`setting-value ${form.settings?.restrict_domain ? 'value-yes' : 'value-no'}`}>
                                {form.settings?.restrict_domain ? 'Yes' : 'No'}
                            </span>
                        </div>
                        {form.settings?.restrict_domain && (
                            <div className="setting-item">
                                <span className="setting-label">Allowed Domain</span>
                                <span className="setting-value">{form.settings?.allowed_domain || '—'}</span>
                            </div>
                        )}
                        {form.published_at && (
                            <div className="setting-item">
                                <span className="setting-label">Published At</span>
                                <span className="setting-value">
                                    {new Date(form.published_at).toLocaleString()}
                                </span>
                            </div>
                        )}
                        <div className="setting-item">
                            <span className="setting-label">Created At</span>
                            <span className="setting-value">
                                {form.created_at ? new Date(form.created_at).toLocaleString() : '—'}
                            </span>
                        </div>
                    </div>
                </section>

                {/* Sections & Questions */}
                <section className="fd-section">
                    <h2 className="section-title">
                        Sections &amp; Questions
                        <span className="count-badge">{sections.length}</span>
                    </h2>
                    {renderSections(sections)}
                </section>
            </div>
        </div>
    );
};

export default FormDetails;
