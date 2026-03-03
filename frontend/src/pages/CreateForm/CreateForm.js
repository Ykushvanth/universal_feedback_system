/**
 * Create Form Page Component
 * Form builder with drag-and-drop sections and questions
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import formService from '../../services/formService';
import './CreateForm.css';

const CreateForm = () => {
    const navigate = useNavigate();
    const { formId } = useParams();
    const isEditMode = !!formId;

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        sections: [],
        settings: {
            restrict_domain: false,
            allowed_domain: 'klu.ac.in',
            prevent_duplicate: false,
            require_email: true,
            general_detail_fields: [] // Custom general detail fields with cascading support
        }
    });

    const [loading, setLoading] = useState(false);
    const [bulkInputs, setBulkInputs] = useState({});

    const setBulkInput = (key, value) => {
        setBulkInputs(prev => ({ ...prev, [key]: value }));
    };

    useEffect(() => {
        if (isEditMode) {
            loadForm();
        }
    }, [formId]);

    const loadForm = async () => {
        try {
            const response = await formService.getForm(formId);
            if (response.success && response.data.form) {
                setFormData(response.data.form);
            }
        } catch (error) {
            toast.error('Failed to load form');
            navigate('/dashboard');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSettingChange = (key, value) => {
        setFormData(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                [key]: value
            }
        }));
    };

    const addSection = (scoringEnabled = false) => {
        const newSection = {
            id: `section_${Date.now()}`,
            title: `Section ${formData.sections.length + 1}`,
            description: '',
            scoring_enabled: scoringEnabled,
            categories: [],
            questions: []
        };

        setFormData(prev => ({
            ...prev,
            sections: [...prev.sections, newSection]
        }));
    };

    const updateSection = (sectionId, field, value) => {
        setFormData(prev => ({
            ...prev,
            sections: prev.sections.map(section =>
                section.id === sectionId
                    ? { ...section, [field]: value }
                    : section
            )
        }));
    };

    const deleteSection = (sectionId) => {
        setFormData(prev => ({
            ...prev,
            sections: prev.sections.filter(section => section.id !== sectionId)
        }));
    };

    const addQuestion = (sectionId) => {
        const newQuestion = {
            id: `question_${Date.now()}`,
            text: '',
            type: 'text',
            required: true,
            options: [],
            option_scores: {},
            max_score: 0
        };

        setFormData(prev => ({
            ...prev,
            sections: prev.sections.map(section =>
                section.id === sectionId
                    ? { ...section, questions: [...section.questions, newQuestion] }
                    : section
            )
        }));
    };

    const updateQuestion = (sectionId, questionId, field, value) => {
        setFormData(prev => ({
            ...prev,
            sections: prev.sections.map(section =>
                section.id === sectionId
                    ? {
                        ...section,
                        questions: section.questions.map(question =>
                            question.id === questionId
                                ? { ...question, [field]: value }
                                : question
                        )
                    }
                    : section
            )
        }));
    };

    const deleteQuestion = (sectionId, questionId) => {
        setFormData(prev => ({
            ...prev,
            sections: prev.sections.map(section =>
                section.id === sectionId
                    ? {
                        ...section,
                        questions: section.questions.filter(q => q.id !== questionId)
                    }
                    : section
            )
        }));
    };

    // Category Management for Scoring Sections
    const addCategory = (sectionId) => {
        const categoryName = prompt('Enter category name (e.g., Teaching Quality, Course Content):');
        if (categoryName && categoryName.trim()) {
            const newCategory = {
                id: `category_${Date.now()}`,
                name: categoryName.trim(),
                description: ''
            };

            setFormData(prev => ({
                ...prev,
                sections: prev.sections.map(section =>
                    section.id === sectionId
                        ? { ...section, categories: [...section.categories, newCategory] }
                        : section
                )
            }));
        }
    };

    const updateCategory = (sectionId, categoryId, field, value) => {
        setFormData(prev => ({
            ...prev,
            sections: prev.sections.map(section =>
                section.id === sectionId
                    ? {
                        ...section,
                        categories: section.categories.map(cat =>
                            cat.id === categoryId ? { ...cat, [field]: value } : cat
                        )
                    }
                    : section
            )
        }));
    };

    const deleteCategory = (sectionId, categoryId) => {
        setFormData(prev => ({
            ...prev,
            sections: prev.sections.map(section =>
                section.id === sectionId
                    ? {
                        ...section,
                        categories: section.categories.filter(cat => cat.id !== categoryId),
                        // Remove category from questions
                        questions: section.questions.map(q =>
                            q.category_id === categoryId ? { ...q, category_id: null } : q
                        )
                    }
                    : section
            )
        }));
    };

    // General Detail Fields Management
    const addGeneralDetailField = () => {
        setFormData(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                general_detail_fields: [
                    ...prev.settings.general_detail_fields,
                    {
                        id: Date.now(),
                        name: '',
                        label: '',
                        type: 'text',
                        required: false,
                        scoring_enabled: false,
                        options: [], // For dropdown/cascading/radio/checkbox
                        option_scores: {}, // { optionValue: score }
                        parent_field: null, // For cascading fields
                        cascading_options: {} // { parentValue: [childOptions] }
                    }
                ]
            }
        }));
    };

    const updateGeneralDetailField = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                general_detail_fields: prev.settings.general_detail_fields.map((detailField, i) => {
                    if (i === index) {
                        const updated = { ...detailField, [field]: value };
                        // Reset cascading options if type changes
                        if (field === 'type' && value !== 'cascading') {
                            updated.parent_field = null;
                            updated.cascading_options = {};
                        }
                        // Reset options if changing from dropdown/cascading/radio/checkbox
                        if (field === 'type' && !['dropdown', 'cascading', 'radio', 'checkbox'].includes(value)) {
                            updated.options = [];
                        }
                        return updated;
                    }
                    return detailField;
                })
            }
        }));
    };

    const removeGeneralDetailField = (index) => {
        setFormData(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                general_detail_fields: prev.settings.general_detail_fields.filter((_, i) => i !== index)
            }
        }));
    };

    const addBulkFieldOptions = (fieldIndex) => {
        const key = `field_${fieldIndex}`;
        const inputVal = (bulkInputs[key] || '').trim();
        if (!inputVal) return;
        const newOptions = inputVal.split(',').map(s => s.trim()).filter(s => s.length > 0);
        if (newOptions.length === 0) return;
        setFormData(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                general_detail_fields: prev.settings.general_detail_fields.map((field, i) => {
                    if (i !== fieldIndex) return field;
                    const existing = field.options || [];
                    const toAdd = newOptions.filter(o => !existing.includes(o));
                    const updatedOptions = [...existing, ...toAdd];
                    const updatedScores = field.scoring_enabled
                        ? toAdd.reduce((acc, o) => ({ ...acc, [o]: 0 }), { ...field.option_scores })
                        : field.option_scores;
                    const updatedCascading = field.type === 'cascading'
                        ? toAdd.reduce((acc, o) => ({ ...acc, [o]: [] }), { ...field.cascading_options })
                        : field.cascading_options;
                    return { ...field, options: updatedOptions, option_scores: updatedScores, cascading_options: updatedCascading };
                })
            }
        }));
        setBulkInput(key, '');
    };

    const removeDropdownOption = (fieldIndex, option) => {
        setFormData(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                general_detail_fields: prev.settings.general_detail_fields.map((field, i) => {
                    if (i === fieldIndex) {
                        const newCascadingOptions = { ...field.cascading_options };
                        delete newCascadingOptions[option];
                        
                        const newOptionScores = { ...field.option_scores };
                        delete newOptionScores[option];
                        
                        return {
                            ...field,
                            options: field.options.filter(o => o !== option),
                            option_scores: newOptionScores,
                            cascading_options: newCascadingOptions
                        };
                    }
                    return field;
                })
            }
        }));
    };

    const addBulkCascadeOptions = (fieldIndex, parentValue) => {
        const key = `cascade_${fieldIndex}_${parentValue}`;
        const inputVal = (bulkInputs[key] || '').trim();
        if (!inputVal) return;
        const newOptions = inputVal.split(',').map(s => s.trim()).filter(s => s.length > 0);
        if (newOptions.length === 0) return;
        setFormData(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                general_detail_fields: prev.settings.general_detail_fields.map((field, i) => {
                    if (i !== fieldIndex) return field;
                    const existing = field.cascading_options[parentValue] || [];
                    const toAdd = newOptions.filter(o => !existing.includes(o));
                    return {
                        ...field,
                        cascading_options: {
                            ...field.cascading_options,
                            [parentValue]: [...existing, ...toAdd]
                        }
                    };
                })
            }
        }));
        setBulkInput(key, '');
    };

    const addBulkQuestionOptions = (sectionId, questionId) => {
        const key = `q_${questionId}`;
        const inputVal = (bulkInputs[key] || '').trim();
        if (!inputVal) return;
        const newOptions = inputVal.split(',').map(s => s.trim()).filter(s => s.length > 0);
        if (newOptions.length === 0) return;
        setFormData(prev => ({
            ...prev,
            sections: prev.sections.map(section =>
                section.id !== sectionId ? section : {
                    ...section,
                    questions: section.questions.map(q => {
                        if (q.id !== questionId) return q;
                        const existing = q.options || [];
                        const toAdd = newOptions.filter(o => !existing.includes(o));
                        const updatedOptions = [...existing, ...toAdd];
                        const updatedScores = toAdd.reduce((acc, o) => ({ ...acc, [o]: 0 }), { ...q.option_scores });
                        return { ...q, options: updatedOptions, option_scores: updatedScores };
                    })
                }
            )
        }));
        setBulkInput(key, '');
    };

    const removeCascadingChildOption = (fieldIndex, parentValue, childOption) => {
        setFormData(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                general_detail_fields: prev.settings.general_detail_fields.map((field, i) => {
                    if (i === fieldIndex) {
                        return {
                            ...field,
                            cascading_options: {
                                ...field.cascading_options,
                                [parentValue]: field.cascading_options[parentValue].filter(o => o !== childOption)
                            }
                        };
                    }
                    return field;
                })
            }
        }));
    };

    const handleSubmit = async (status = 'draft') => {
        if (!formData.title.trim()) {
            toast.error('Please enter a form title');
            return;
        }

        if (formData.sections.length === 0 && status !== 'draft') {
            toast.error('Please add at least one section before publishing');
            return;
        }

        setLoading(true);

        try {
            // Strip out incomplete general_detail_fields (missing name or label)
            const cleanedGeneralDetailFields = (formData.settings?.general_detail_fields || [])
                .filter(f => f.label?.trim() && f.name?.trim());

            const dataToSubmit = {
                title: formData.title,
                description: formData.description,
                sections: formData.sections,
                status: status,
                settings: {
                    ...formData.settings,
                    general_detail_fields: cleanedGeneralDetailFields
                }
            };

            console.log('Submitting form data:', dataToSubmit);

            let response;
            if (isEditMode) {
                response = await formService.updateForm(formId, dataToSubmit);
            } else {
                response = await formService.createForm(dataToSubmit);
            }

            console.log('Form submission response:', response);

            if (response && response.success) {
                const draftMsg = status === 'draft' ? 'saved as draft' : (isEditMode ? 'updated' : 'published');
                toast.success(`Form ${draftMsg} successfully!`);
                navigate('/dashboard');
            } else {
                const errorMsg = response?.message || `Failed to ${isEditMode ? 'update' : 'create'} form`;
                toast.error(errorMsg);
            }
        } catch (error) {
            console.error('Form submission error:', error);
            const errorMsg = error?.response?.data?.message || error?.message || `Failed to ${isEditMode ? 'update' : 'create'} form`;
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // Helper: Get all possible values from parent field's cascading options
    const getParentFieldValues = (parentFieldName) => {
        const parentField = formData.settings.general_detail_fields.find(f => f.name === parentFieldName);
        if (!parentField) return [];

        // If parent is a simple dropdown, return its options
        if (parentField.type === 'dropdown') {
            return parentField.options || [];
        }

        // If parent is cascading, collect ALL child values from cascading_options
        if (parentField.type === 'cascading' && parentField.cascading_options) {
            const allValues = [];
            Object.values(parentField.cascading_options).forEach(childArray => {
                if (Array.isArray(childArray)) {
                    childArray.forEach(val => {
                        if (!allValues.includes(val)) {
                            allValues.push(val);
                        }
                    });
                }
            });
            return allValues;
        }

        return [];
    };

    // Render question card (extracted for reusability)
    const renderQuestionCard = (section, question, qNumber) => (
        <>
            <div className="question-header">
                <span>Q{qNumber}</span>
                <button
                    onClick={() => deleteQuestion(section.id, question.id)}
                    className="btn-delete-small"
                >
                    ×
                </button>
            </div>

            <div className="form-group">
                <input
                    type="text"
                    value={question.text}
                    onChange={(e) => updateQuestion(section.id, question.id, 'text', e.target.value)}
                    placeholder="Enter question text"
                    className="input-text"
                />
            </div>

            <div className="question-options">
                <select
                    value={question.type}
                    onChange={(e) => updateQuestion(section.id, question.id, 'type', e.target.value)}
                    className="input-select"
                >
                    <option value="text">Short Text</option>
                    <option value="textarea">Long Text</option>
                    <option value="radio">Multiple Choice</option>
                    <option value="checkbox">Checkboxes</option>
                    <option value="rating">Rating</option>
                </select>

                <label className="checkbox-label-inline">
                    <input
                        type="checkbox"
                        checked={question.required}
                        onChange={(e) => updateQuestion(section.id, question.id, 'required', e.target.checked)}
                    />
                    Required
                </label>

                {/* Max score only for text/textarea questions */}
                {!['radio', 'checkbox'].includes(question.type) && (
                    <input
                        type="number"
                        value={question.max_score}
                        onChange={(e) => updateQuestion(section.id, question.id, 'max_score', parseInt(e.target.value) || 0)}
                        placeholder="Max score"
                        className="input-score"
                        min="0"
                    />
                )}
            </div>

            {/* Options for Multiple Choice and Checkboxes */}
            {['radio', 'checkbox'].includes(question.type) && (
                <div style={{ marginTop: '12px', padding: '12px', background: '#f9fafb', borderRadius: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                        Options (with scores):
                    </label>

                    {question.options && question.options.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                            {question.options.map((option, optIndex) => (
                                <div key={optIndex} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', background: 'white', borderRadius: '4px' }}>
                                    <span style={{ minWidth: '25px', fontSize: '12px', color: '#666' }}>{optIndex + 1}.</span>
                                    <input
                                        type="text"
                                        value={option}
                                        onChange={(e) => {
                                            const newOptions = [...question.options];
                                            newOptions[optIndex] = e.target.value;
                                            updateQuestion(section.id, question.id, 'options', newOptions);
                                        }}
                                        placeholder="Option text"
                                        className="input-text"
                                        style={{ flex: 1, fontSize: '13px', padding: '6px 8px' }}
                                    />
                                    
                                    {/* Score input for ALL multiple choice questions */}
                                    <input
                                        type="number"
                                        value={question.option_scores?.[option] || 0}
                                        onChange={(e) => {
                                            const newScores = { ...question.option_scores, [option]: parseFloat(e.target.value) || 0 };
                                            updateQuestion(section.id, question.id, 'option_scores', newScores);
                                        }}
                                        placeholder="Score"
                                        style={{ width: '70px', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px' }}
                                    />
                                    <span style={{ fontSize: '11px', color: '#666', minWidth: '20px' }}>pts</span>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newOptions = question.options.filter((_, i) => i !== optIndex);
                                            const newScores = { ...question.option_scores };
                                            delete newScores[option];
                                            updateQuestion(section.id, question.id, 'options', newOptions);
                                            updateQuestion(section.id, question.id, 'option_scores', newScores);
                                        }}
                                        className="btn-delete-small"
                                        style={{ padding: '2px 6px', fontSize: '12px' }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>No options yet</p>
                    )}

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                        <input
                            type="text"
                            value={bulkInputs[`q_${question.id}`] || ''}
                            onChange={(e) => setBulkInput(`q_${question.id}`, e.target.value)}
                            placeholder="Enter options (comma-separated: A, B, C)"
                            className="input-text"
                            style={{ flex: 1, fontSize: '13px', padding: '6px 8px' }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBulkQuestionOptions(section.id, question.id); } }}
                        />
                        <button type="button" onClick={() => addBulkQuestionOptions(section.id, question.id)} className="btn-add-small">+ Add</button>
                    </div>
                </div>
            )}
        </>
    );

    return (
        <div className="create-form-container">
            <div className="create-form-header">
                <div>
                    <h1>{isEditMode ? 'Edit Form' : 'Create New Form'}</h1>
                    <p>Build your feedback form with custom sections and questions</p>
                </div>
                <button onClick={() => navigate('/dashboard')} className="btn-back">
                    ← Back to Dashboard
                </button>
            </div>

            <div className="create-form-content">
                {/* Form Basic Info */}
                <div className="form-section card">
                    <h2>Form Details</h2>
                    <div className="form-group">
                        <label>Form Title *</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            placeholder="Enter form title"
                            className="input-text"
                        />
                    </div>
                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            placeholder="Enter form description"
                            className="input-textarea"
                            rows="3"
                        />
                    </div>
                </div>

                {/* Settings */}
                <div className="form-section card">
                    <h2>Settings</h2>
                    
                    <h3 style={{ fontSize: '16px', marginTop: '0', marginBottom: '12px', color: '#666' }}>General Settings</h3>
                    <div className="settings-grid">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={formData.settings.require_email}
                                onChange={(e) => handleSettingChange('require_email', e.target.checked)}
                            />
                            Require email address
                        </label>
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={formData.settings.prevent_duplicate}
                                onChange={(e) => handleSettingChange('prevent_duplicate', e.target.checked)}
                            />
                            Prevent duplicate submissions
                        </label>
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={formData.settings.restrict_domain}
                                onChange={(e) => handleSettingChange('restrict_domain', e.target.checked)}
                            />
                            Restrict to domain
                        </label>
                        {formData.settings.restrict_domain && (
                            <div className="form-group">
                                <input
                                    type="text"
                                    value={formData.settings.allowed_domain}
                                    onChange={(e) => handleSettingChange('allowed_domain', e.target.value)}
                                    placeholder="example.com"
                                    className="input-text"
                                />
                            </div>
                        )}
                    </div>

                    <h3 style={{ fontSize: '16px', marginTop: '24px', marginBottom: '12px', color: '#666' }}>General Detail Fields</h3>
                    <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>Add custom fields to collect user information. Support for text inputs, dropdowns, radio buttons (single choice), checkboxes (multiple choice), and cascading dropdowns. Enable scoring for choice-based fields to assign points for analysis.</p>
                    <div className="custom-fields-section">
                        {formData.settings.general_detail_fields.map((field, index) => (
                            <div key={field.id} className="custom-field-item" style={{ display: 'block', padding: '16px', marginBottom: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#f9fafb' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                    <input
                                        type="text"
                                        value={field.name}
                                        onChange={(e) => updateGeneralDetailField(index, 'name', e.target.value)}
                                        placeholder="Field Name (e.g., degree, country)"
                                        className="input-text"
                                        style={{ flex: 1 }}
                                    />
                                    <input
                                        type="text"
                                        value={field.label}
                                        onChange={(e) => updateGeneralDetailField(index, 'label', e.target.value)}
                                        placeholder="Field Label (e.g., Your Degree)"
                                        className="input-text"
                                        style={{ flex: 1 }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeGeneralDetailField(index)}
                                        className="btn-delete-small"
                                    >
                                        ✕
                                    </button>
                                </div>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                    <select
                                        value={field.type}
                                        onChange={(e) => updateGeneralDetailField(index, 'type', e.target.value)}
                                        className="input-select"
                                        style={{ width: '180px' }}
                                    >
                                        <option value="text">Text</option>
                                        <option value="number">Number</option>
                                        <option value="email">Email</option>
                                        <option value="tel">Phone</option>
                                        <option value="date">Date</option>
                                        <option value="dropdown">Dropdown</option>
                                        <option value="radio">Radio Buttons (Single Choice)</option>
                                        <option value="checkbox">Checkboxes (Multiple Choice)</option>
                                        <option value="cascading">Cascading Dropdown</option>
                                    </select>
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={field.required}
                                            onChange={(e) => updateGeneralDetailField(index, 'required', e.target.checked)}
                                        />
                                        Required
                                    </label>

                                    {['dropdown', 'radio', 'checkbox'].includes(field.type) && (
                                        <label className="checkbox-label" style={{ marginLeft: '12px' }}>
                                            <input
                                                type="checkbox"
                                                checked={field.scoring_enabled || false}
                                                onChange={(e) => updateGeneralDetailField(index, 'scoring_enabled', e.target.checked)}
                                            />
                                            Enable Scoring
                                        </label>
                                    )}
                                    
                                    {field.type === 'cascading' && (
                                        <select
                                            value={field.parent_field || ''}
                                            onChange={(e) => updateGeneralDetailField(index, 'parent_field', e.target.value)}
                                            className="input-select"
                                            style={{ flex: 1 }}
                                        >
                                            <option value="">Select Parent Field...</option>
                                            {formData.settings.general_detail_fields
                                                .filter((f, i) => i < index && (f.type === 'dropdown' || f.type === 'cascading'))
                                                .map((f, i) => (
                                                    <option key={i} value={f.name}>{f.label || f.name}</option>
                                                ))}
                                        </select>
                                    )}
                                </div>

                                {/* Dropdown/Radio/Checkbox Options */}
                                {['dropdown', 'radio', 'checkbox'].includes(field.type) && (
                                    <div style={{ marginTop: '12px', padding: '12px', background: 'white', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                                        <label style={{ fontSize: '13px', color: '#666', marginBottom: '6px', display: 'block', fontWeight: '600' }}>
                                            {field.type === 'dropdown' ? 'Dropdown' : field.type === 'radio' ? 'Radio Button' : 'Checkbox'} Options {field.scoring_enabled && '(with scores)'}:
                                        </label>
                                        
                                        {!field.scoring_enabled ? (
                                            <>
                                                <div className="options-tags-container" style={{ marginBottom: '8px' }}>
                                                    {field.options.map((option, optIndex) => (
                                                        <span key={optIndex} className="option-tag">
                                                            {option}
                                                            <button
                                                                type="button"
                                                                onClick={() => removeDropdownOption(index, option)}
                                                                className="tag-remove"
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                                                    <input
                                                        type="text"
                                                        value={bulkInputs[`field_${index}`] || ''}
                                                        onChange={(e) => setBulkInput(`field_${index}`, e.target.value)}
                                                        placeholder="Enter options (comma-separated: A, B, C)"
                                                        className="input-text"
                                                        style={{ flex: 1, fontSize: '13px', padding: '6px 8px' }}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBulkFieldOptions(index); } }}
                                                    />
                                                    <button type="button" onClick={() => addBulkFieldOptions(index)} className="btn-add-small">+ Add</button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                                                    {field.options.map((option, optIndex) => (
                                                        <div key={optIndex} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: '#f9fafb', borderRadius: '4px' }}>
                                                            <span style={{ flex: 1, fontSize: '13px' }}>{option}</span>
                                                            <input
                                                                type="number"
                                                                value={field.option_scores?.[option] || 0}
                                                                onChange={(e) => {
                                                                    const newScores = { ...field.option_scores, [option]: parseFloat(e.target.value) || 0 };
                                                                    updateGeneralDetailField(index, 'option_scores', newScores);
                                                                }}
                                                                placeholder="Score"
                                                                style={{ width: '80px', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px' }}
                                                            />
                                                            <span style={{ fontSize: '12px', color: '#666' }}>pts</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeDropdownOption(index, option)}
                                                                className="btn-delete-small"
                                                                style={{ padding: '2px 6px', fontSize: '12px' }}
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                                                    <input
                                                        type="text"
                                                        value={bulkInputs[`field_${index}`] || ''}
                                                        onChange={(e) => setBulkInput(`field_${index}`, e.target.value)}
                                                        placeholder="Enter options (comma-separated: A, B, C)"
                                                        className="input-text"
                                                        style={{ flex: 1, fontSize: '13px', padding: '6px 8px' }}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBulkFieldOptions(index); } }}
                                                    />
                                                    <button type="button" onClick={() => addBulkFieldOptions(index)} className="btn-add-small">+ Add</button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Cascading Options */}
                                {field.type === 'cascading' && field.parent_field && (() => {
                                    const parentValues = getParentFieldValues(field.parent_field);
                                    
                                    return (
                                        <div style={{ marginTop: '12px', padding: '12px', background: 'white', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                                            <label style={{ fontSize: '13px', color: '#666', marginBottom: '8px', display: 'block', fontWeight: '600' }}>
                                                Cascading Options (depends on {field.parent_field}):
                                            </label>

                                            {parentValues.length === 0 ? (
                                                <p style={{ fontSize: '12px', color: '#f59e0b', marginBottom: '8px', padding: '8px', background: '#fffbeb', borderRadius: '4px' }}>
                                                    ⚠️ Parent field "{field.parent_field}" has no options yet. Add options to the parent field first.
                                                </p>
                                            ) : (
                                                <>
                                                    <p style={{ fontSize: '12px', color: '#10b981', marginBottom: '12px', padding: '8px', background: '#f0fdf4', borderRadius: '4px' }}>
                                                        ✓ Found {parentValues.length} option(s) from "{field.parent_field}": <strong>{parentValues.join(', ')}</strong>
                                                    </p>

                                                    {/* Show child options for each parent value */}
                                                    {parentValues.map((parentOption, pIndex) => (
                                                        <div key={pIndex} style={{ marginTop: '12px', padding: '12px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                                                            <label style={{ fontSize: '12px', color: '#333', marginBottom: '6px', display: 'block', fontWeight: '600' }}>
                                                                Options for "<strong>{parentOption}</strong>":
                                                            </label>
                                                            <div className="options-tags-container" style={{ marginBottom: '6px' }}>
                                                                {(field.cascading_options[parentOption] || []).map((childOption, cIndex) => (
                                                                    <span key={cIndex} className="option-tag" style={{ fontSize: '12px' }}>
                                                                        {childOption}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeCascadingChildOption(index, parentOption, childOption)}
                                                                            className="tag-remove"
                                                                        >
                                                                            ×
                                                                        </button>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                                                            <input
                                                                type="text"
                                                                value={bulkInputs[`cascade_${index}_${parentOption}`] || ''}
                                                                onChange={(e) => setBulkInput(`cascade_${index}_${parentOption}`, e.target.value)}
                                                                placeholder="Enter options (comma-separated: A, B, C)"
                                                                className="input-text"
                                                                style={{ flex: 1, fontSize: '12px', padding: '4px 8px' }}
                                                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBulkCascadeOptions(index, parentOption); } }}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => addBulkCascadeOptions(index, parentOption)}
                                                                className="btn-add-small"
                                                                style={{ fontSize: '12px', padding: '4px 8px' }}
                                                            >
                                                                + Add
                                                            </button>
                                                        </div>
                                                    </div>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addGeneralDetailField}
                            className="btn-add-field"
                            style={{ marginTop: '8px' }}
                        >
                            + Add General Detail Field
                        </button>
                    </div>
                </div>

                {/* Sections */}
                <div className="form-section">
                    <div className="section-header">
                        <h2>Form Sections</h2>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => addSection(true)} className="btn-add" style={{ background: '#0284c7' }}>
                                + Add Scoring Section
                            </button>
                            <button onClick={() => addSection(false)} className="btn-add" style={{ background: '#059669' }}>
                                + Add Non-Scoring Section
                            </button>
                        </div>
                    </div>

                    {formData.sections.map((section, sectionIndex) => (
                        <div key={section.id} className="section-card card">
                            <div className="section-card-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <h3>Section {sectionIndex + 1}</h3>
                                    <span style={{ 
                                        fontSize: '11px', 
                                        padding: '4px 10px', 
                                        borderRadius: '12px', 
                                        fontWeight: '600',
                                        background: section.scoring_enabled ? '#e0f2fe' : '#d1fae5',
                                        color: section.scoring_enabled ? '#0284c7' : '#059669'
                                    }}>
                                        {section.scoring_enabled ? '📊 Scoring Section' : '📝 Non-Scoring Section'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => deleteSection(section.id)}
                                    className="btn-delete-icon"
                                >
                                    🗑️
                                </button>
                            </div>

                            <div className="form-group">
                                <label>Section Title</label>
                                <input
                                    type="text"
                                    value={section.title}
                                    onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                                    placeholder="Enter section title"
                                    className="input-text"
                                />
                            </div>

                            <div className="form-group">
                                <label>Section Description</label>
                                <textarea
                                    value={section.description}
                                    onChange={(e) => updateSection(section.id, 'description', e.target.value)}
                                    placeholder="Enter section description"
                                    className="input-textarea"
                                    rows="2"
                                />
                            </div>

                            {/* Questions */}
                            <div className="questions-container">
                                <div className="questions-header">
                                    <h4>Questions</h4>
                                    <button
                                        onClick={() => addQuestion(section.id)}
                                        className="btn-add-small"
                                    >
                                        + Add Question
                                    </button>
                                </div>

                                {section.questions.map((question, qIndex) => (
                                    <div key={question.id} className="question-card">{renderQuestionCard(section, question, qIndex + 1)}</div>
                                ))}

                                {section.questions.length === 0 && (
                                    <p className="empty-message">No questions yet. Click "Add Question" to start.</p>
                                )}
                            </div>
                        </div>
                    ))}

                    {formData.sections.length === 0 && (
                        <div className="empty-state card">
                            <p>No sections yet. Click "Add Scoring Section" or "Add Non-Scoring Section" to start building your form.</p>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="form-actions">
                    <button
                        onClick={() => handleSubmit('draft')}
                        className="btn-secondary"
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : (isEditMode ? 'Save as Draft' : 'Save as Draft')}
                    </button>
                    <button
                        onClick={() => handleSubmit('active')}
                        className="btn-primary"
                        disabled={loading}
                    >
                        {loading ? (isEditMode ? 'Updating...' : 'Publishing...') : (isEditMode ? 'Update & Publish' : 'Publish Form')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateForm;
