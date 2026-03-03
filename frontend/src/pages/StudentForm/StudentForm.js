/**
 * Student Form Page Component
 * Public form view for students to submit responses
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import formService from '../../services/formService';
import responseService from '../../services/responseService';
import './StudentForm.css';

const StudentForm = () => {
    const { formId } = useParams();
    const navigate = useNavigate();

    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [formClosed, setFormClosed] = useState(false);
    const [formNotFound, setFormNotFound] = useState(false);

    const [generalDetails, setGeneralDetails] = useState({
        name: '',
        email: ''
    });

    const [answers, setAnswers] = useState({});

    useEffect(() => {
        loadForm();
    }, [formId]);

    const loadForm = async () => {
        try {
            setLoading(true);
            const response = await formService.getForm(formId, true);

            if (response.success && response.data.form) {
                setForm(response.data.form);
                initializeAnswers(response.data.form);
            } else {
                setFormNotFound(true);
            }
        } catch (error) {
            const msg = (error?.message || '').toLowerCase();
            if (msg.includes('not accepting') || msg.includes('closed') || msg.includes('inactive')) {
                setFormClosed(true);
            } else if (msg.includes('not found')) {
                setFormNotFound(true);
            } else {
                // For any other error, still show closed screen to avoid blank redirects
                setFormClosed(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const initializeAnswers = (formData) => {
        const initialAnswers = {};
        formData.sections.forEach(section => {
            section.questions.forEach(question => {
                initialAnswers[question.id] = {
                    question_id: question.id,
                    type: question.type,
                    value: question.type === 'checkbox' ? [] : ''
                };
            });
        });
        setAnswers(initialAnswers);
    };

    const handleGeneralDetailChange = (e) => {
        const { name, value } = e.target;
        setGeneralDetails(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleGeneralDetailCheckboxChange = (fieldName, optionValue, checked) => {
        setGeneralDetails(prev => {
            const currentValues = Array.isArray(prev[fieldName]) ? prev[fieldName] : [];
            const newValues = checked
                ? [...currentValues, optionValue]
                : currentValues.filter(v => v !== optionValue);
            return {
                ...prev,
                [fieldName]: newValues
            };
        });
    };

    const handleCascadingFieldChange = (field, value) => {
        setGeneralDetails(prev => {
            const updated = { ...prev, [field.name]: value };
            
            // Reset all dependent child fields when parent changes
            if (form?.settings?.general_detail_fields) {
                form.settings.general_detail_fields.forEach(f => {
                    if (f.parent_field === field.name) {
                        updated[f.name] = '';
                    }
                });
            }
            
            return updated;
        });
    };

    // Get available options for cascading dropdown based on parent value
    const getCascadingOptions = (field) => {
        if (!field.parent_field || !generalDetails[field.parent_field]) {
            return [];
        }
        return field.cascading_options[generalDetails[field.parent_field]] || [];
    };

    const handleAnswerChange = (questionId, value, type) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: {
                ...prev[questionId],
                value: value
            }
        }));
    };

    const handleCheckboxChange = (questionId, option, checked) => {
        setAnswers(prev => {
            const currentValues = prev[questionId].value || [];
            const newValues = checked
                ? [...currentValues, option]
                : currentValues.filter(v => v !== option);

            return {
                ...prev,
                [questionId]: {
                    ...prev[questionId],
                    value: newValues
                }
            };
        });
    };

    const validateForm = () => {
        const settings = form.settings || {};
        
        // Validate general details
        if (!generalDetails.name.trim()) {
            toast.error('Name is required');
            return false;
        }

        if (!generalDetails.email.trim()) {
            toast.error('Email is required');
            return false;
        }

        if (!/\S+@\S+\.\S+/.test(generalDetails.email)) {
            toast.error('Invalid email format');
            return false;
        }

        // Validate general detail fields
        const validDetailFields = (settings.general_detail_fields || []).filter(
            f => f.label?.trim() && f.name?.trim()
        );
        if (validDetailFields.length > 0) {
            for (const field of validDetailFields) {
                if (field.required) {
                    // For checkbox fields, check if array has at least one item
                    if (field.type === 'checkbox') {
                        if (!Array.isArray(generalDetails[field.name]) || generalDetails[field.name].length === 0) {
                            toast.error(`Please select at least one option for ${field.label}`);
                            return false;
                        }
                    }
                    // For other fields, check if value exists and is not empty
                    else if (!generalDetails[field.name]?.trim?.() && !generalDetails[field.name]) {
                        toast.error(`${field.label} is required`);
                        return false;
                    }
                }
            }
        }

        // Validate required questions
        for (const section of form.sections || []) {
            for (const question of section.questions) {
                if (question.required) {
                    const answer = answers[question.id];
                    if (!answer || !answer.value || (Array.isArray(answer.value) && answer.value.length === 0)) {
                        toast.error(`Please answer: ${question.text}`);
                        return false;
                    }
                }
            }
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setSubmitting(true);

        try {
            const responseData = {
                form_id: formId,
                general_details: generalDetails,
                answers: Object.values(answers)
            };

            const response = await responseService.submitResponse(responseData);

            if (response.success) {
                toast.success('Response submitted successfully!');
                setSubmitted(true);
            } else {
                toast.error(response.message || 'Failed to submit response');
            }
        } catch (error) {
            // error may be a server JSON response { message: '...' } or a native Error
            const message = error?.message || error?.error || 'Failed to submit response';
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="student-form-loading">
                <div className="spinner"></div>
                <p>Loading form...</p>
            </div>
        );
    }

    if (formClosed) {
        return (
            <div className="sf-closed-screen">
                <div className="sf-closed-card">
                    <div className="sf-closed-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                    </div>
                    <h1 className="sf-closed-title">Form Closed</h1>
                    <p className="sf-closed-subtitle">This form is no longer accepting responses.</p>
                    <div className="sf-closed-divider" />
                    <p className="sf-closed-notice">
                        This feedback form has been closed by the Administrator.<br />
                        Response collection for this form has ended.<br />
                        If you believe this is an error, please contact your administrator.
                    </p>
                    <div className="sf-closed-footer">
                        <span className="sf-closed-badge">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            Closed by Administrator
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    if (formNotFound) {
        return (
            <div className="sf-closed-screen">
                <div className="sf-closed-card">
                    <div className="sf-closed-icon sf-not-found-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="11" cy="11" r="8"/>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            <line x1="11" y1="8" x2="11" y2="14"/>
                            <line x1="11" y1="16" x2="11.01" y2="16"/>
                        </svg>
                    </div>
                    <h1 className="sf-closed-title">Form Not Found</h1>
                    <p className="sf-closed-notice" style={{ marginTop: '1rem' }}>
                        The form you are looking for does not exist or the link may be incorrect.
                        Please check the URL and try again.
                    </p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="student-form-success">
                <div className="success-icon">✓</div>
                <h1>Thank You!</h1>
                <p>Your response has been submitted successfully.</p>
            </div>
        );
    }

    return (
        <div className="student-form-container">
            <div className="student-form-card">
                <div className="form-header">
                    <h1>{form.title}</h1>
                    {form.description && <p>{form.description}</p>}
                </div>

                <form onSubmit={handleSubmit}>
                    {/* General Details Section */}
                    <div className="form-section">
                        <h2>General Details</h2>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Full Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={generalDetails.name}
                                    onChange={handleGeneralDetailChange}
                                    placeholder="Enter your name"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Email *</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={generalDetails.email}
                                    onChange={handleGeneralDetailChange}
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>

                            {/* Dynamic General Detail Fields */}
                            {form.settings?.general_detail_fields && form.settings.general_detail_fields.length > 0 && 
                                form.settings.general_detail_fields
                                .filter(field => field.label?.trim() && field.name?.trim())
                                .map((field, index) => (
                                    <div key={field.id} className="form-group">
                                        <label>
                                            {field.label}
                                            {field.required && ' *'}
                                        </label>
                                        
                                        {/* Text/Number/Email/Phone/Date inputs */}
                                        {['text', 'number', 'email', 'tel', 'date'].includes(field.type) && (
                                            <input
                                                type={field.type}
                                                name={field.name}
                                                value={generalDetails[field.name] || ''}
                                                onChange={handleGeneralDetailChange}
                                                placeholder={`Enter ${field.label.toLowerCase()}`}
                                                required={field.required}
                                                className="input-text"
                                            />
                                        )}
                                        
                                        {/* Simple Dropdown */}
                                        {field.type === 'dropdown' && field.options && field.options.length > 0 && (
                                            <select
                                                name={field.name}
                                                value={generalDetails[field.name] || ''}
                                                onChange={handleGeneralDetailChange}
                                                className="input-select"
                                                required={field.required}
                                            >
                                                <option value="">Select {field.label}</option>
                                                {field.options.map((option, optIndex) => (
                                                    <option key={optIndex} value={option}>{option}</option>
                                                ))}
                                            </select>
                                        )}
                                        
                                        {/* Radio Buttons (Single Choice) */}
                                        {field.type === 'radio' && field.options && field.options.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                                                {field.options.map((option, optIndex) => (
                                                    <label key={optIndex} className="checkbox-label" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                                        <input
                                                            type="radio"
                                                            name={field.name}
                                                            value={option}
                                                            checked={generalDetails[field.name] === option}
                                                            onChange={handleGeneralDetailChange}
                                                            required={field.required && !generalDetails[field.name]}
                                                            style={{ marginRight: '8px' }}
                                                        />
                                                        {option}
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {/* Checkboxes (Multiple Choice) */}
                                        {field.type === 'checkbox' && field.options && field.options.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                                                {field.options.map((option, optIndex) => (
                                                    <label key={optIndex} className="checkbox-label" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                                        <input
                                                            type="checkbox"
                                                            value={option}
                                                            checked={Array.isArray(generalDetails[field.name]) && generalDetails[field.name].includes(option)}
                                                            onChange={(e) => handleGeneralDetailCheckboxChange(field.name, option, e.target.checked)}
                                                            style={{ marginRight: '8px' }}
                                                        />
                                                        {option}
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {/* Cascading Dropdown */}
                                        {field.type === 'cascading' && (
                                            <>
                                                {/* Show parent options first if no parent_field */}
                                                {!field.parent_field && field.options && field.options.length > 0 && (
                                                    <select
                                                        name={field.name}
                                                        value={generalDetails[field.name] || ''}
                                                        onChange={(e) => handleCascadingFieldChange(field, e.target.value)}
                                                        className="input-select"
                                                        required={field.required}
                                                    >
                                                        <option value="">Select {field.label}</option>
                                                        {field.options.map((option, optIndex) => (
                                                            <option key={optIndex} value={option}>{option}</option>
                                                        ))}
                                                    </select>
                                                )}
                                                
                                                {/* Show cascading options if has parent_field */}
                                                {field.parent_field && (
                                                    <select
                                                        name={field.name}
                                                        value={generalDetails[field.name] || ''}
                                                        onChange={(e) => handleCascadingFieldChange(field, e.target.value)}
                                                        className="input-select"
                                                        required={field.required}
                                                        disabled={!generalDetails[field.parent_field]}
                                                    >
                                                        <option value="">
                                                            {generalDetails[field.parent_field] 
                                                                ? `Select ${field.label}` 
                                                                : `Select ${field.parent_field} first`}
                                                        </option>
                                                        {getCascadingOptions(field).map((option, optIndex) => (
                                                            <option key={optIndex} value={option}>{option}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ))
                            }
                        </div>
                    </div>

                    {/* Form Sections */}
                    {form.sections.map((section, sectionIndex) => (
                        <div key={section.id} className="form-section">
                            <h2>{section.title}</h2>
                            {section.description && <p className="section-desc">{section.description}</p>}

                            {section.questions.map((question, qIndex) => (
                                <div key={question.id} className="question-group">
                                    <label>
                                        {qIndex + 1}. {question.text}
                                        {question.required && <span className="required">*</span>}
                                    </label>

                                    {question.type === 'text' && (
                                        <input
                                            type="text"
                                            value={answers[question.id]?.value || ''}
                                            onChange={(e) => handleAnswerChange(question.id, e.target.value, question.type)}
                                            placeholder="Your answer"
                                            required={question.required}
                                        />
                                    )}

                                    {question.type === 'textarea' && (
                                        <textarea
                                            value={answers[question.id]?.value || ''}
                                            onChange={(e) => handleAnswerChange(question.id, e.target.value, question.type)}
                                            placeholder="Your answer"
                                            rows="4"
                                            required={question.required}
                                        />
                                    )}

                                    {question.type === 'radio' && question.options && (
                                        <div className="options-group">
                                            {question.options.map((option, optIndex) => (
                                                <label key={optIndex} className="radio-label">
                                                    <input
                                                        type="radio"
                                                        name={question.id}
                                                        value={option}
                                                        checked={answers[question.id]?.value === option}
                                                        onChange={(e) => handleAnswerChange(question.id, e.target.value, question.type)}
                                                        required={question.required}
                                                    />
                                                    {option}
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {question.type === 'checkbox' && question.options && (
                                        <div className="options-group">
                                            {question.options.map((option, optIndex) => (
                                                <label key={optIndex} className="checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        checked={(answers[question.id]?.value || []).includes(option)}
                                                        onChange={(e) => handleCheckboxChange(question.id, option, e.target.checked)}
                                                    />
                                                    {option}
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {question.type === 'rating' && (
                                        <div className="rating-group">
                                            {[1, 2, 3, 4, 5].map(rating => (
                                                <label key={rating} className="rating-label">
                                                    <input
                                                        type="radio"
                                                        name={question.id}
                                                        value={rating}
                                                        checked={answers[question.id]?.value === rating.toString()}
                                                        onChange={(e) => handleAnswerChange(question.id, e.target.value, question.type)}
                                                        required={question.required}
                                                    />
                                                    {rating}
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}

                    <div className="form-submit">
                        <button
                            type="submit"
                            className="btn-submit"
                            disabled={submitting}
                        >
                            {submitting ? 'Submitting...' : 'Submit Response'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StudentForm;
