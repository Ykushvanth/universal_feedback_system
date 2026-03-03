/**
 * Form Responses Page
 * Professional IQAC-style viewer with dynamic filters and expandable cards
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import formService from '../../services/formService';
import responseService from '../../services/responseService';
import './FormResponses.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};

const buildQMap = (form) => {
    const map = {};
    (form?.sections || []).forEach(sec => {
        (sec.questions || []).forEach(q => {
            map[q.id] = { ...q, sectionTitle: sec.title };
        });
    });
    return map;
};

// ── Main Component ────────────────────────────────────────────────────────────

const FormResponses = () => {
    const { formId } = useParams();
    const navigate   = useNavigate();

    const [form,      setForm]      = useState(null);
    const [responses, setResponses] = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [loadingR,  setLoadingR]  = useState(false);
    const [expanded,  setExpanded]  = useState({});
    const [qMap,      setQMap]      = useState({});

    const [filterFields, setFilterFields] = useState([]);
    const [filters,      setFilters]      = useState({});

    useEffect(() => { loadForm(); }, [formId]); // eslint-disable-line

    const loadForm = async () => {
        try {
            setLoading(true);
            const res = await formService.getForm(formId);
            if (res.success) {
                const f = res.data.form;
                setForm(f);
                setQMap(buildQMap(f));
                const fields = (f.settings?.general_detail_fields || []).filter(
                    field => field.label?.trim() && field.name?.trim()
                );
                setFilterFields(fields);
            } else {
                toast.error('Failed to load form');
                navigate('/dashboard');
            }
        } catch {
            toast.error('Failed to load form');
            navigate('/dashboard');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (form) loadResponses();
    }, [filters, form?.form_id]); // eslint-disable-line

    const loadResponses = useCallback(async () => {
        try {
            setLoadingR(true);
            const active = Object.fromEntries(
                Object.entries(filters).filter(([, v]) => v?.trim())
            );
            const res = await responseService.getResponses(formId, active);
            if (res.success) {
                setResponses(res.data.responses || []);
            }
        } catch (e) {
            console.error('Failed to load responses:', e);
            toast.error('Failed to load responses');
        } finally {
            setLoadingR(false);
        }
    }, [formId, filters]); // eslint-disable-line

    const handleFilterChange = (fieldName, value) => {
        setFilters(prev => {
            const updated = { ...prev, [fieldName]: value };
            filterFields.forEach(f => { if (f.parent_field === fieldName) updated[f.name] = ''; });
            return updated;
        });
    };

    const clearFilters = () => setFilters({});

    const exportCSV = () => {
        if (responses.length === 0) { toast.error('No responses to export'); return; }
        const generalKeys = filterFields.map(f => f.name);
        const headerRow   = ['#', 'Submitted At', 'Name', 'Email', ...filterFields.map(f => f.label)];
        const rows = responses.map((r, i) => [
            i + 1,
            fmtDate(r.submitted_at),
            `"${(r.general_details?.name || r.general_details?.full_name || '').toString().replace(/"/g, '""')}"`,
            `"${(r.general_details?.email || '').toString().replace(/"/g, '""')}"`,
            ...generalKeys.map(k => `"${(r.general_details?.[k] || '').toString().replace(/"/g, '""')}"`),
        ]);
        const csv  = [headerRow.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `responses_${formId}_${Date.now()}.csv`; a.click();
        URL.revokeObjectURL(url);
        toast.success('Exported successfully');
    };

    const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    const handleDeleteResponse = async (e, responseId) => {
        e.stopPropagation();
        if (!window.confirm('Delete this response? This cannot be undone.')) return;
        try {
            const res = await responseService.deleteResponse(responseId);
            if (res.success) {
                toast.success('Response deleted');
                setResponses(prev => prev.filter(r => r.response_id !== responseId));
            }
        } catch {
            toast.error('Failed to delete response');
        }
    };

    const renderFilters = () => {
        if (filterFields.length === 0) return null;
        const hasActive = Object.values(filters).some(v => v?.trim());
        return (
            <div className="fr-filters-bar">
                <div className="fr-filters-head">
                    <span className="fr-filters-title">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                        </svg>
                        Filter Responses
                    </span>
                    {hasActive && (
                        <button className="fr-btn-clear" onClick={clearFilters}>Clear All</button>
                    )}
                </div>
                <div className="fr-filters-grid">
                    {filterFields.map(field => {
                        const isCascading = !!field.parent_field;
                        let opts = [];
                        if (isCascading) {
                            const pv = filters[field.parent_field] || '';
                            opts = pv && field.cascading_options ? (field.cascading_options[pv] || []) : [];
                        } else if (Array.isArray(field.options) && field.options.length > 0) {
                            opts = field.options;
                        }
                        const disabled = isCascading && !filters[field.parent_field];
                        return (
                            <div key={field.name} className="fr-filter-group">
                                <label>{field.label}</label>
                                {(opts.length > 0 || isCascading) ? (
                                    <select
                                        value={filters[field.name] || ''}
                                        onChange={e => handleFilterChange(field.name, e.target.value)}
                                        disabled={disabled}
                                    >
                                        <option value="">
                                            {disabled
                                                ? `Select ${filterFields.find(f => f.name === field.parent_field)?.label || 'parent'} first`
                                                : 'All'}
                                        </option>
                                        {opts.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        placeholder="All"
                                        value={filters[field.name] || ''}
                                        onChange={e => handleFilterChange(field.name, e.target.value)}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
                {hasActive && (
                    <div className="fr-filter-chips">
                        {Object.entries(filters).filter(([, v]) => v?.trim()).map(([k, v]) => {
                            const label = filterFields.find(f => f.name === k)?.label || k;
                            return (
                                <span key={k} className="fr-chip">
                                    <span className="fr-chip-key">{label}:</span>
                                    <strong>{v}</strong>
                                    <button onClick={() => handleFilterChange(k, '')}>&#x2715;</button>
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    if (loading && !form) {
        return (
            <div className="fr-full-loading">
                <div className="fr-spinner" />
                <p>Loading responses...</p>
            </div>
        );
    }

    const hasActive = Object.values(filters).some(v => v?.trim());

    return (
        <div className="fr-container">

            {/* ── Header ── */}
            <div className="fr-header">
                <div className="fr-header-top">
                    <div className="fr-branding">
                        <div className="fr-avatar">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                        </div>
                        <div>
                            <h1 className="fr-title">{form?.title || 'Responses'}</h1>
                            <p className="fr-sub">Response Viewer &amp; Export</p>
                        </div>
                    </div>
                    <div className="fr-actions">
                        <button className="fr-btn secondary" onClick={() => navigate(`/forms/${formId}/analysis`)}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                            </svg>
                            View Analysis
                        </button>
                        <button className="fr-btn primary" onClick={exportCSV}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            Export CSV
                        </button>
                        <button className="fr-btn back" onClick={() => navigate('/dashboard')}>
                            &#8592; Dashboard
                        </button>
                    </div>
                </div>

                <div className="fr-stats-row">
                    <div className="fr-stat-item">
                        <div className="fr-stat-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                            </svg>
                        </div>
                        <div className="fr-stat-content">
                            <span className="fr-stat-label">Showing</span>
                            <span className="fr-stat-value">
                                {loadingR ? '…' : responses.length}
                                {hasActive && <span className="fr-stat-sub"> filtered</span>}
                            </span>
                        </div>
                    </div>
                    <div className="fr-stat-item">
                        <div className="fr-stat-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                        </div>
                        <div className="fr-stat-content">
                            <span className="fr-stat-label">Form Sections</span>
                            <span className="fr-stat-value">{form?.sections?.length ?? '—'}</span>
                        </div>
                    </div>
                    {filterFields.length > 0 && (
                        <div className="fr-stat-item">
                            <div className="fr-stat-icon">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                                </svg>
                            </div>
                            <div className="fr-stat-content">
                                <span className="fr-stat-label">Active Filters</span>
                                <span className="fr-stat-value">
                                    {Object.values(filters).filter(v => v?.trim()).length} / {filterFields.length}
                                </span>
                            </div>
                        </div>
                    )}
                    <div className="fr-stat-item">
                        <div className="fr-stat-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                            </svg>
                        </div>
                        <div className="fr-stat-content">
                            <span className="fr-stat-label">Latest At</span>
                            <span className="fr-stat-value fr-stat-date">
                                {responses[0] ? fmtDate(responses[0].submitted_at) : '—'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main content ── */}
            <main className="fr-main">

                {renderFilters()}

                {loadingR ? (
                    <div className="fr-inline-loading">
                        <div className="fr-spinner" />
                        <p>Loading responses...</p>
                    </div>
                ) : responses.length === 0 ? (
                    <div className="fr-empty">
                        <div className="fr-empty-icon">
                            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                            </svg>
                        </div>
                        <h3>No Responses Found</h3>
                        <p>
                            {hasActive
                                ? 'No responses match the selected filters. Try clearing some filters.'
                                : 'No responses have been submitted yet. Share the form link to start collecting feedback.'}
                        </p>
                        {hasActive && (
                            <button className="fr-btn-clear-lg" onClick={clearFilters}>
                                Clear all filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="fr-list">
                        {responses.map((resp, idx) => {
                            const isOpen  = !!expanded[resp.response_id];
                            const details = resp.general_details || {};
                            const answers = resp.answers || [];

                            return (
                                <div key={resp.response_id} className={`fr-card${isOpen ? ' fr-card--open' : ''}`}>
                                    <div
                                        className="fr-card-head"
                                        onClick={() => toggle(resp.response_id)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={e => e.key === 'Enter' && toggle(resp.response_id)}
                                        aria-expanded={isOpen}
                                    >
                                        <div className="fr-card-num">#{idx + 1}</div>
                                        <div className="fr-card-info">
                                            <div className="fr-card-name">
                                                {details.name || details.full_name || `Response ${idx + 1}`}
                                            </div>
                                            <div className="fr-card-meta">
                                                {filterFields.slice(0, 4).map(f =>
                                                    details[f.name] ? (
                                                        <span key={f.name} className="fr-card-tag">{details[f.name]}</span>
                                                    ) : null
                                                )}
                                            </div>
                                        </div>
                                        <div className="fr-card-right">
                                            <span className="fr-card-date">{fmtDate(resp.submitted_at)}</span>
                                            {resp.scores?.total_score !== undefined && (
                                                <span className="fr-score-badge">
                                                    {resp.scores.total_score} / {form?.settings?.total_max_score || '?'}
                                                </span>
                                            )}
                                            <button
                                                className="fr-btn-delete-card"
                                                title="Delete this response"
                                                onClick={(e) => handleDeleteResponse(e, resp.response_id)}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <polyline points="3 6 5 6 21 6"/>
                                                    <path d="M19 6l-1 14H6L5 6"/>
                                                    <path d="M10 11v6M14 11v6"/>
                                                    <path d="M9 6V4h6v2"/>
                                                </svg>
                                            </button>
                                            <span className={`fr-chevron${isOpen ? ' fr-chevron--open' : ''}`}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <polyline points="6 9 12 15 18 9"/>
                                                </svg>
                                            </span>
                                        </div>
                                    </div>

                                    {isOpen && (
                                        <div className="fr-card-body">
                                            <div className="fr-details-section">
                                                <h4 className="fr-details-heading">Respondent Details</h4>
                                                <div className="fr-details-grid">
                                                    <div className="fr-detail-row">
                                                        <span className="fr-detail-key">Name</span>
                                                        <span className="fr-detail-val">{details.name || details.full_name || '—'}</span>
                                                    </div>
                                                    <div className="fr-detail-row">
                                                        <span className="fr-detail-key">Email</span>
                                                        <span className="fr-detail-val">{details.email || '—'}</span>
                                                    </div>
                                                    {filterFields.map(f => (
                                                        <div key={f.name} className="fr-detail-row">
                                                            <span className="fr-detail-key">{f.label}</span>
                                                            <span className="fr-detail-val">{details[f.name] || '—'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                                <div className="fr-answers-section">
                                                    <h4 className="fr-details-heading">Answers</h4>
                                                    {(form?.sections || []).map(sec => {
                                                        const secAnswers = answers.filter(a =>
                                                            sec.questions?.some(q => q.id === a.question_id)
                                                        );
                                                        if (secAnswers.length === 0) return null;
                                                        return (
                                                            <div key={sec.id} className="fr-section-group">
                                                                <div className="fr-section-label">{sec.title}</div>
                                                                <div className="fr-answers-list">
                                                                    {secAnswers.map((ans, ai) => {
                                                                        const q = qMap[ans.question_id];
                                                                        return (
                                                                            <div key={ai} className="fr-answer-item">
                                                                                <div className="fr-answer-q">
                                                                                    <span className="fr-answer-qnum">Q{ai + 1}</span>
                                                                                    {q?.text || ans.question_id}
                                                                                </div>
                                                                                <div className="fr-answer-a">
                                                                                    {Array.isArray(ans.value)
                                                                                        ? ans.value.join(', ')
                                                                                        : (ans.value ?? '—')}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                            <div className="fr-card-actions">
                                                <button
                                                    className="fr-btn fr-btn-delete-resp"
                                                    onClick={(e) => handleDeleteResponse(e, resp.response_id)}
                                                >
                                                    🗑️ Delete this response
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

export default FormResponses;
