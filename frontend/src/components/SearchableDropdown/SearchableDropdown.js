/**
 * SearchableDropdown
 * A type-to-search dropdown that replaces native <select> for long option lists.
 * Props:
 *   options       - string[]
 *   value         - currently selected value (string)
 *   onChange      - (value: string) => void
 *   placeholder   - e.g. "Select Department"
 *   disabled      - boolean
 *   required      - boolean
 */

import React, { useState, useRef, useEffect } from 'react';
import './SearchableDropdown.css';

const SearchableDropdown = ({
    options = [],
    value = '',
    onChange,
    placeholder = 'Select an option',
    disabled = false,
    required = false,
}) => {
    const [open,   setOpen]   = useState(false);
    const [search, setSearch] = useState('');
    const containerRef        = useRef(null);
    const inputRef            = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = options.filter(opt =>
        opt.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (opt) => {
        onChange(opt);
        setOpen(false);
        setSearch('');
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange('');
        setSearch('');
    };

    const handleToggle = () => {
        if (disabled) return;
        setOpen(prev => {
            if (!prev) setTimeout(() => inputRef.current?.focus(), 50);
            return !prev;
        });
        setSearch('');
    };

    return (
        <div className={`sdd-wrapper${disabled ? ' sdd-disabled' : ''}${open ? ' sdd-open' : ''}`} ref={containerRef}>
            {/* Trigger box */}
            <div
                className="sdd-trigger"
                onClick={handleToggle}
                tabIndex={disabled ? -1 : 0}
                onKeyDown={(e) => e.key === 'Enter' && handleToggle()}
                role="combobox"
                aria-expanded={open}
                aria-haspopup="listbox"
            >
                <span className={`sdd-value${!value ? ' sdd-placeholder' : ''}`}>
                    {value || placeholder}
                </span>
                <div className="sdd-icons">
                    {value && !disabled && (
                        <button className="sdd-clear" onClick={handleClear} tabIndex={-1} type="button" title="Clear">
                            &#x2715;
                        </button>
                    )}
                    <span className={`sdd-arrow${open ? ' sdd-arrow-up' : ''}`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="6 9 12 15 18 9"/>
                        </svg>
                    </span>
                </div>
            </div>

            {/* Dropdown panel */}
            {open && (
                <div className="sdd-panel" role="listbox">
                    <div className="sdd-search-wrap">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        <input
                            ref={inputRef}
                            className="sdd-search"
                            type="text"
                            placeholder="Type to search..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onClick={e => e.stopPropagation()}
                        />
                        {search && (
                            <button className="sdd-search-clear" onClick={() => setSearch('')} type="button">&#x2715;</button>
                        )}
                    </div>

                    <ul className="sdd-list">
                        {filtered.length === 0 ? (
                            <li className="sdd-no-results">No matches found</li>
                        ) : (
                            filtered.map((opt, i) => (
                                <li
                                    key={i}
                                    className={`sdd-option${opt === value ? ' sdd-option-selected' : ''}`}
                                    onClick={() => handleSelect(opt)}
                                    role="option"
                                    aria-selected={opt === value}
                                >
                                    {opt === value && (
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{marginRight: 7, flexShrink: 0}}>
                                            <polyline points="20 6 9 17 4 12"/>
                                        </svg>
                                    )}
                                    {/* Highlight matching text */}
                                    {search ? highlightMatch(opt, search) : opt}
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}

            {/* Hidden input so required validation still works */}
            {required && <input type="text" value={value} required readOnly tabIndex={-1} style={{opacity:0, height:0, position:'absolute'}} />}
        </div>
    );
};

function highlightMatch(text, query) {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
        <>
            {text.slice(0, idx)}
            <mark className="sdd-highlight">{text.slice(idx, idx + query.length)}</mark>
            {text.slice(idx + query.length)}
        </>
    );
}

export default SearchableDropdown;
