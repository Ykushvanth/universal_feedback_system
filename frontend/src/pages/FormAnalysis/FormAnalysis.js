/**
 * Form Analysis Page Component
 * Analytics dashboard - styled after IQAC AnalysisResults design
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import formService from '../../services/formService';
import analysisService from '../../services/analysisService';
import './FormAnalysis.css';

// Recharts - optional, graceful fallback if not installed
let BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer;
let hasRecharts = false;
try {
    const r = require('recharts');
    ({ BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = r);
    hasRecharts = true;
} catch (e) { hasRecharts = false; }

const SENTIMENT_COLORS = {
    positive: '#2e7d32', mostly_positive: '#388e3c', neutral: '#f57c00',
    mostly_negative: '#e57373', negative: '#d32f2f', mixed: '#1565c0',
    not_applicable: '#757575'
};

const scoreClass = (score) => {
    if (score === null || score === undefined) return '';
    if (score >= 75) return 'success';
    if (score >= 50) return 'warning';
    return 'danger';
};

const FormAnalysis = () => {
    const { formId } = useParams();
    const navigate = useNavigate();

    const [form, setForm]           = useState(null);
    const [analysis, setAnalysis]   = useState(null);
    const [loading, setLoading]     = useState(true);
    const [activeSection, setActiveSection] = useState('overview'); // 'overview' | section_id

    const [pendingFilters, setPendingFilters] = useState({});
    const [appliedFilters, setAppliedFilters]   = useState({});
    const [filterFields, setFilterFields]       = useState([]);
    const [showReportPanel, setShowReportPanel] = useState(false);
    const [commentTabs, setCommentTabs]         = useState({}); // questionId → active tab
    const [overviewCommentTab, setOverviewCommentTab] = useState('all');
    const [reportOptions, setReportOptions]     = useState({
        overview: true, sections: true, questions: true,
        sentiment: true, negative_comments: true
    });

    useEffect(() => { loadForm(); }, [formId]);                           // eslint-disable-line
    useEffect(() => { if (form) loadAnalysis(); }, [appliedFilters, form?.form_id]); // eslint-disable-line

    const loadForm = async () => {
        try {
            setLoading(true);
            const res = await formService.getForm(formId);
            if (res.success) {
                const f = res.data.form;
                setForm(f);
                setFilterFields(
                    (f.settings?.general_detail_fields || []).filter(
                        field => field.label?.trim() && field.name?.trim()
                    )
                );
            }
        } catch { toast.error('Failed to load form'); navigate('/dashboard'); }
        finally { setLoading(false); }
    };

    const loadAnalysis = async () => {
        try {
            setLoading(true);
            const active = Object.fromEntries(
                Object.entries(appliedFilters).filter(([, v]) => v && v.trim())
            );
            const res = await analysisService.getFormAnalysis(formId, active);
            if (res.success) {
                setAnalysis(res.data.analysis);
                setActiveSection('overview');
            } else {
                toast.error(res.message || 'Failed to load analysis');
            }
        } catch (e) {
            console.error(e);
            toast.error('Failed to load analysis');
        } finally { setLoading(false); }
    };

    // ── Filter helpers ────────────────────────────────────────────────────────

    const handleFilterChange = (fieldName, value) => {
        setPendingFilters(prev => {
            const updated = { ...prev, [fieldName]: value };
            filterFields.forEach(f => { if (f.parent_field === fieldName) updated[f.name] = ''; });
            return updated;
        });
    };

    const clearFilters = () => {
        setPendingFilters({});
        setAppliedFilters({});
    };

    const applyFilters = () => {
        setAppliedFilters({ ...pendingFilters });
    };

    // ── Report generation ─────────────────────────────────────────────────────

    const getActiveFilterLabel = () => {
        const entries = Object.entries(appliedFilters).filter(([, v]) => v?.trim());
        if (!entries.length) return 'All Responses';
        return entries.map(([k, v]) => `${k}: ${v}`).join(', ');
    };

    const downloadBlob = (content, filename, mime) => {
        const blob = new Blob([content], { type: mime });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
    };

    const generateJSON = () => {
        if (!analysis) return;
        const payload = {
            form_title:   form?.title,
            generated_at: new Date().toISOString(),
            filters:      appliedFilters,
            ...(reportOptions.overview && {
                overview: {
                    total_responses: analysis.total_responses,
                    overall_score:   analysis.overall_score,
                    overall_sentiment: analysis.overall_sentiment,
                    sentiment_distribution: analysis.sentiment_distribution
                }
            }),
            ...(reportOptions.sections && { section_analysis: analysis.section_analysis }),
            ...(reportOptions.questions && { question_analysis: analysis.question_analysis }),
            ...(reportOptions.sentiment && { sentiment_details: analysis.sentiment_details })
        };
        downloadBlob(
            JSON.stringify(payload, null, 2),
            `${form?.title || 'analysis'}_report_${Date.now()}.json`,
            'application/json'
        );
    };

    const generateCSV = (forExcel = false) => {
        if (!analysis) return;
        const rows = [];
        const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
        // Header block
        rows.push(['Form Analysis Report']);
        rows.push([`Form: ${form?.title}`]);
        rows.push([`Generated: ${new Date().toLocaleString()}`]);
        rows.push([`Filter: ${getActiveFilterLabel()}`]);
        rows.push([]);

        if (reportOptions.overview) {
            rows.push(['OVERVIEW']);
            rows.push(['Metric', 'Value']);
            rows.push(['Total Responses', analysis.total_responses ?? 0]);
            rows.push(['Overall Score', analysis.overall_score != null ? `${analysis.overall_score}%` : 'N/A']);
            rows.push(['Overall Sentiment', (analysis.overall_sentiment || 'N/A').replace(/_/g, ' ')]);
            rows.push([]);
        }

        if (reportOptions.sections && analysis.section_analysis?.length) {
            rows.push(['SECTION ANALYSIS']);
            rows.push(['Section', 'Score', 'Scoring Questions', 'Total Questions']);
            analysis.section_analysis.forEach(s => {
                rows.push([
                    s.section_title,
                    s.section_score != null ? `${s.section_score}%` : 'Open Text',
                    s.scoring_question_count ?? 0,
                    s.total_questions ?? 0
                ]);
            });
            rows.push([]);
        }

        if (reportOptions.questions && analysis.question_analysis?.length) {
            rows.push(['QUESTION ANALYSIS']);
            rows.push(['Section', 'Question', 'Type', 'Total Responses', 'Score', 'Avg Rating', 'Top Option', 'Top Option %']);
            analysis.question_analysis.forEach(q2 => {
                const secTitle = analysis.section_analysis?.find(s => s.section_id === q2.section_id)?.section_title || '';
                const opts = Object.entries(q2.option_distribution || {});
                const total = opts.reduce((s, [, c]) => s + Number(c), 0) || 1;
                const top   = opts.sort((a, b) => Number(b[1]) - Number(a[1]))[0];
                rows.push([
                    secTitle,
                    q2.question_text,
                    q2.question_type,
                    q2.total_responses ?? 0,
                    q2.question_score != null ? `${q2.question_score}%` : 'N/A',
                    q2.average_rating != null ? parseFloat(q2.average_rating).toFixed(2) : 'N/A',
                    top ? top[0] : 'N/A',
                    top ? `${Math.round((Number(top[1]) / total) * 100)}%` : 'N/A'
                ]);

                // Option distribution rows
                if (opts.length > 0) {
                    rows.push(['', '', 'Option', 'Count', 'Percentage']);
                    opts.forEach(([opt, cnt]) => {
                        rows.push(['', '', opt, cnt, `${Math.round((Number(cnt) / total) * 100)}%`]);
                    });
                }

                if (reportOptions.negative_comments && q2.all_comments?.length > 0) {
                    const groups = [
                        { label: 'Positive Comments', items: [...(q2.positive_comments || []), ...(q2.mostly_positive_comments || [])] },
                        { label: 'Neutral Comments',  items: q2.neutral_comments || [] },
                        { label: 'Negative Comments', items: [...(q2.negative_comments || []), ...(q2.mostly_negative_comments || [])] },
                        { label: 'Mixed Comments',    items: q2.mixed_comments    || [] },
                    ];
                    groups.forEach(({ label, items }) => {
                        if (items.length > 0) {
                            rows.push(['', '', `${label} (${items.length}):`]);
                            items.forEach((c, i) => rows.push(['', '', `  ${i + 1}.`, c.text]));
                        }
                    });
                }
                rows.push([]);
            });
        }

        const csv = rows.map(r => r.map(c => q(c)).join(',')).join('\n');
        const bom  = '\uFEFF'; // UTF-8 BOM for Excel
        const ext  = forExcel ? 'csv' : 'csv';
        downloadBlob(
            bom + csv,
            `${form?.title || 'analysis'}_report_${Date.now()}.${ext}`,
            'text/csv;charset=utf-8'
        );
    };

    const generateExcel = () => {
        if (!analysis) return;
        // Build HTML table-based XML that Excel can open natively
        const escape = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const cell   = (v, bold = false, bg = '') => {
            const style = [bold ? 'font-weight:bold' : '', bg ? `background:${bg}` : ''].filter(Boolean).join(';');
            return `<td style="${style}">${escape(v)}</td>`;
        };

        let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body><table>`;

        const row = (...cells) => `<tr>${cells.join('')}</tr>`;
        html += row(cell(`Form Analysis Report: ${form?.title}`, true, '#1a237e'));
        html += row(cell(`Generated: ${new Date().toLocaleString()}`));
        html += row(cell(`Filter: ${getActiveFilterLabel()}`));
        html += row(cell(''));

        if (reportOptions.overview) {
            html += row(cell('OVERVIEW', true, '#e8eaf6'));
            html += row(cell('Total Responses', true), cell(analysis.total_responses ?? 0));
            html += row(cell('Overall Score', true), cell(analysis.overall_score != null ? `${analysis.overall_score}%` : 'N/A'));
            html += row(cell('Overall Sentiment', true), cell((analysis.overall_sentiment || 'N/A').replace(/_/g, ' ')));
            html += row(cell(''));
        }

        if (reportOptions.sections && analysis.section_analysis?.length) {
            html += row(cell('SECTION ANALYSIS', true, '#e8eaf6'));
            html += row(cell('Section', true), cell('Score', true), cell('Scoring Questions', true), cell('Total Questions', true));
            analysis.section_analysis.forEach(s => {
                html += row(
                    cell(s.section_title),
                    cell(s.section_score != null ? `${s.section_score}%` : 'Open Text'),
                    cell(s.scoring_question_count ?? 0),
                    cell(s.total_questions ?? 0)
                );
            });
            html += row(cell(''));
        }

        if (reportOptions.questions && analysis.question_analysis?.length) {
            html += row(cell('QUESTION ANALYSIS', true, '#e8eaf6'));
            html += row(cell('Section', true), cell('Question', true), cell('Type', true), cell('Responses', true), cell('Score', true), cell('Avg Rating', true));
            analysis.question_analysis.forEach(q2 => {
                const secTitle = analysis.section_analysis?.find(s => s.section_id === q2.section_id)?.section_title || '';
                html += row(cell(secTitle), cell(q2.question_text), cell(q2.question_type), cell(q2.total_responses ?? 0), cell(q2.question_score != null ? `${q2.question_score}%` : 'N/A'), cell(q2.average_rating != null ? parseFloat(q2.average_rating).toFixed(2) : 'N/A'));
                const opts = Object.entries(q2.option_distribution || {});
                if (opts.length) {
                    const total = opts.reduce((s, [, c]) => s + Number(c), 0) || 1;
                    html += row(cell(''), cell('Option', true), cell('Count', true), cell('Percentage', true));
                    opts.forEach(([opt, cnt]) => {
                        html += row(cell(''), cell(opt), cell(cnt), cell(`${Math.round((Number(cnt)/total)*100)}%`));
                    });
                }
                if (reportOptions.negative_comments && q2.all_comments?.length) {
                    const groups = [
                        { label: 'Positive Comments', items: [...(q2.positive_comments || []), ...(q2.mostly_positive_comments || [])] },
                        { label: 'Neutral Comments',  items: q2.neutral_comments || [] },
                        { label: 'Negative Comments', items: [...(q2.negative_comments || []), ...(q2.mostly_negative_comments || [])] },
                        { label: 'Mixed Comments',    items: q2.mixed_comments    || [] },
                    ];
                    groups.forEach(({ label, items }) => {
                        if (items.length > 0) {
                            html += row(cell(''), cell(`${label} (${items.length})`, true));
                            items.forEach((c, i) => html += row(cell(''), cell(`${i+1}. ${c.text}`)));
                        }
                    });
                }
                html += row(cell(''));
            });
        }

        html += '</table></body></html>';
        downloadBlob(html, `${form?.title || 'analysis'}_report_${Date.now()}.xls`, 'application/vnd.ms-excel');
    };

    const openPrintView = () => {
        if (!analysis) return;
        const w = window.open('', '_blank', 'width=900,height=700');
        const escape = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const scoreColor = (x) => x >= 75 ? '#1b5e20' : x >= 50 ? '#e65100' : '#b71c1c';
        const secBars = (analysis.section_analysis || []).filter(s => s.section_score !== null)
            .map(s => `<div style="margin-bottom:12px">
                <div style="display:flex;justify-content:space-between;font-weight:600;margin-bottom:4px">
                    <span>${escape(s.section_title)}</span><span style="color:${scoreColor(s.section_score)}">${s.section_score}%</span></div>
                <div style="background:#e0e0e0;border-radius:4px;height:14px">
                    <div style="width:${s.section_score}%;background:${scoreColor(s.section_score)};height:14px;border-radius:4px"></div></div></div>`).join('');
        const qCards = reportOptions.questions ? (analysis.question_analysis || []).map((q2, i) => {
            const opts = Object.entries(q2.option_distribution || {});
            const total = opts.reduce((s, [, c]) => s + Number(c), 0) || 1;
            const optRows = opts.map(([opt, cnt]) => {
                const pct = Math.round((Number(cnt)/total)*100);
                return `<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:12px">
                    <span>${escape(opt)}</span><span>${cnt} (${pct}%)</span></div>
                    <div style="background:#e0e0e0;border-radius:3px;height:8px">
                    <div style="width:${pct}%;background:#3949ab;height:8px;border-radius:3px"></div></div></div>`;
            }).join('');
            const negComs = (reportOptions.negative_comments && q2.negative_comments?.length)
                ? `<div style="margin-top:8px;padding:8px;background:#fff3e0;border-radius:4px;border-left:3px solid #e65100">
                    <b style="font-size:12px;color:#e65100">Negative Comments:</b><ul style="margin:4px 0 0 16px;font-size:12px">${q2.negative_comments.map(c => `<li>${escape(c.text)}</li>`).join('')}</ul></div>` : '';
            return `<div style="border:1px solid #e0e0e0;border-radius:8px;padding:16px;margin-bottom:12px;break-inside:avoid">
                <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
                    <span style="background:#1a237e;color:white;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700">Q${i+1}</span>
                    <span style="font-weight:600;font-size:13px">${escape(q2.question_text)}</span>
                    ${q2.question_score != null ? `<span style="margin-left:auto;color:${scoreColor(q2.question_score)};font-weight:700">${q2.question_score}%</span>` : ''}
                </div>
                ${optRows}${negComs}</div>`;
        }).join('') : '';

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escape(form?.title)} - Analysis Report</title>
<style>body{font-family:Arial,sans-serif;margin:32px;color:#1a1a1a;font-size:14px} h1{color:#1a237e;font-size:22px;margin-bottom:4px} .subtitle{color:#666;margin-bottom:24px} .card{border:1px solid #e0e0e0;border-radius:10px;padding:20px;margin-bottom:20px;break-inside:avoid} .metric-row{display:flex;gap:24px;margin-bottom:20px} .metric{text-align:center;flex:1;border:1px solid #e0e0e0;border-radius:8px;padding:16px} .metric-val{font-size:28px;font-weight:800;color:#1a237e} .metric-lbl{font-size:12px;color:#666;margin-top:4px} h2{font-size:16px;color:#1a237e;margin:0 0 12px} @media print{body{margin:16px} .no-print{display:none}}</style></head><body>
<h1>${escape(form?.title)}</h1>
<p class="subtitle">Analysis Report &bull; Generated: ${new Date().toLocaleString()} &bull; Filter: ${escape(getActiveFilterLabel())}</p>
<button class="no-print" onclick="window.print()" style="margin-bottom:20px;padding:10px 24px;background:#1a237e;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px">&#128438; Print / Save as PDF</button>
${reportOptions.overview ? `<div class="metric-row">
    <div class="metric"><div class="metric-val">${analysis.total_responses ?? 0}</div><div class="metric-lbl">Total Responses</div></div>
    <div class="metric"><div class="metric-val">${analysis.overall_score != null ? `${analysis.overall_score}%` : 'N/A'}</div><div class="metric-lbl">Overall Score</div></div>
    ${analysis.overall_sentiment && analysis.overall_sentiment !== 'not_applicable' ? `<div class="metric"><div class="metric-val" style="font-size:18px">${(analysis.overall_sentiment||'').replace(/_/g,' ')}</div><div class="metric-lbl">Sentiment</div></div>` : ''}
</div>` : ''}
${reportOptions.sections && secBars ? `<div class="card"><h2>Section Performance</h2>${secBars}</div>` : ''}
${reportOptions.questions && qCards ? `<div class="card"><h2>Question Analysis</h2>${qCards}</div>` : ''}
</body></html>`;
        w.document.write(html);
        w.document.close();
    };

    // ── Tabular (Department-wise) Report ──────────────────────────────────────

    const generateTabularPrint = async () => {
        try {
            const active = Object.fromEntries(
                Object.entries(appliedFilters).filter(([, v]) => v && v.trim())
            );
            const res = await analysisService.getTabularReport(formId, active);
            if (!res.success) { toast.error('Failed to fetch tabular data'); return; }
            const rpData = res.data.report;
            _renderTabularPrint(rpData);
        } catch (e) { toast.error('Failed to generate tabular report'); console.error(e); }
    };

    const generateTabularExcel = async () => {
        try {
            const active = Object.fromEntries(
                Object.entries(appliedFilters).filter(([, v]) => v && v.trim())
            );
            const res = await analysisService.getTabularReport(formId, active);
            if (!res.success) { toast.error('Failed to fetch tabular data'); return; }
            _renderTabularExcel(res.data.report);
        } catch (e) { toast.error('Failed to generate tabular Excel'); console.error(e); }
    };

    const _renderTabularPrint = (rpData) => {
        const escape = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const scoreColor = v => v === null ? '#888' : v >= 75 ? '#1b5e20' : '#b71c1c';
        const scoreBg    = v => v === null ? '#fff' : v >= 75 ? '#e8f5e9' : '#ffebee';
        const fmt        = v => v === null ? '—' : `${v}%`;

        // Group questions by section
        const sectionMap = {};
        rpData.sections.forEach(s => { sectionMap[s.id] = s.title; });
        const sectionQs = {};
        rpData.questions.forEach(q => {
            if (!sectionQs[q.section_id]) sectionQs[q.section_id] = [];
            sectionQs[q.section_id].push(q);
        });
        const scoringQs    = rpData.questions.filter(q => q.question_type !== 'text' && q.question_type !== 'textarea');
        const nonScoringQs = rpData.questions.filter(q => q.question_type === 'text' || q.question_type === 'textarea');

        // Header metadata from first row
        const firstRow   = rpData.rows[0] || {};
        const headerMeta = firstRow.identity || {};
        const filtersSuffix = Object.entries(rpData.filters || {}).filter(([,v]) => v).map(([k,v]) => `${k}: ${v}`).join(' | ') || 'All';

        // Build section header row (colspans)
        const sectionsByOrder = rpData.sections.filter(s => sectionQs[s.id]?.length > 0);
        const idKeys = rpData.identity_keys || Object.keys(headerMeta);
        const scoreKeys = rpData.score_keys || [];

        let sectionHeaderRow = `<th colspan="${idKeys.length}" style="${thBoldStyle('#1a237e','#bbdefb')}">Response Details</th>`;
        sectionsByOrder.forEach(s => {
            const qs = (sectionQs[s.id] || []).filter(q => scoringQs.find(sq => sq.question_id === q.question_id));
            if (qs.length > 0) {
                sectionHeaderRow += `<th colspan="${qs.length}" style="${thBoldStyle('#fff','#1a237e')}">${escape(s.title)}</th>`;
            }
        });
        const nonScSections = rpData.sections.filter(s => (sectionQs[s.id] || []).some(q => nonScoringQs.find(nsq => nsq.question_id === q.question_id)));
        if (nonScSections.length > 0) {
            const nsCount = nonScSections.reduce((acc, s) => acc + (sectionQs[s.id] || []).filter(q => nonScoringQs.find(nsq => nsq.question_id === q.question_id)).length, 0);
            if (nsCount > 0) sectionHeaderRow += `<th colspan="${nsCount}" style="${thBoldStyle('#fff','#455a64')}">Non-scoring Sections</th>`;
        }
        if (scoreKeys.length > 0) sectionHeaderRow += `<th colspan="${scoreKeys.length}" style="${thBoldStyle('#fff','#e65100')}">Extra Scores</th>`;
        sectionHeaderRow += `<th style="${thBoldStyle('#fff','#0d47a1')}">Final Score</th><th style="${thBoldStyle('#fff','#0d47a1')}">Responses</th>`;

        // Question sub-header row
        let qHeaderRow = idKeys.map(k => `<th style="${thStyle('#e8eaf6','#1a237e')}">${escape(k.replace(/_/g,' '))}</th>`).join('');
        sectionsByOrder.forEach(s => {
            (sectionQs[s.id] || []).filter(q => scoringQs.find(sq => sq.question_id === q.question_id)).forEach(q => {
                qHeaderRow += `<th title="${escape(q.question_text)}" style="${thStyle('#e8eaf6','#333')}">${escape(q.question_text.substring(0,18))}…</th>`;
            });
        });
        nonScSections.forEach(s => {
            (sectionQs[s.id] || []).filter(q => nonScoringQs.find(nsq => nsq.question_id === q.question_id)).forEach(q => {
                qHeaderRow += `<th title="${escape(q.question_text)}" style="${thStyle('#eceff1','#555')}">${escape(q.question_text.substring(0,18))}…</th>`;
            });
        });
        scoreKeys.forEach(k => { qHeaderRow += `<th style="${thStyle('#fff3e0','#bf360c')}">${escape(k.replace(/_/g,' '))}</th>`; });
        qHeaderRow += `<th style="${thStyle('#e3f2fd','#0d47a1')}">Final Score</th><th style="${thStyle('#e3f2fd','#0d47a1')}">#</th>`;

        // Data rows
        const dataRows = rpData.rows.map(row => {
            let cells = idKeys.map(k => `<td style="${tdStyle()}">${escape(row.identity[k] || '')}</td>`).join('');
            sectionsByOrder.forEach(s => {
                (sectionQs[s.id] || []).filter(q => scoringQs.find(sq => sq.question_id === q.question_id)).forEach(q => {
                    const v = row.question_scores[q.question_id]?.score ?? null;
                    cells += `<td style="background:${scoreBg(v)};color:${scoreColor(v)};font-weight:700;${tdStyle()}">${fmt(v)}</td>`;
                });
            });
            nonScSections.forEach(s => {
                (sectionQs[s.id] || []).filter(q => nonScoringQs.find(nsq => nsq.question_id === q.question_id)).forEach(q => {
                    const cnt = row.question_scores[q.question_id]?.total_responses ?? 0;
                    cells += `<td style="${tdStyle()}">${cnt} resp.</td>`;
                });
            });
            scoreKeys.forEach(k => { cells += `<td style="${tdStyle()}">${escape(row.scores_extra[k] || '')}</td>`; });
            const fs = row.final_score;
            cells += `<td style="background:${scoreBg(fs)};color:${scoreColor(fs)};font-weight:800;${tdStyle()}">${fmt(fs)}</td>`;
            cells += `<td style="${tdStyle()}">${row.response_count}</td>`;
            return `<tr>${cells}</tr>`;
        }).join('');

        const w = window.open('', '_blank', 'width=1200,height=800');
        w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escape(rpData.form_title)} — Tabular Report</title>
<style>body{font-family:Arial,sans-serif;font-size:11px;margin:20px;color:#111} h1{color:#1a237e;font-size:18px;margin-bottom:2px} p.sub{color:#555;font-size:12px;margin-bottom:12px} table{border-collapse:collapse;width:100%;font-size:10.5px} th,td{border:1px solid #ccc;padding:5px 7px;white-space:nowrap} .legend{margin-top:16px;display:flex;gap:16px;font-size:11px} .lg{display:flex;align-items:center;gap:6px} .lb{width:14px;height:14px;border-radius:3px} @media print{.no-print{display:none}}</style>
</head><body>
<h1>Department-wise Feedback Analysis Report</h1>
<p class="sub">Form: <b>${escape(rpData.form_title)}</b> &nbsp;|&nbsp; Filter: ${escape(filtersSuffix)} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Total Responses: ${rpData.total_responses}</p>
<button class="no-print" onclick="window.print()" style="margin-bottom:12px;padding:8px 20px;background:#1a237e;color:white;border:none;border-radius:5px;cursor:pointer;font-size:12px">🖨 Print / Save as PDF</button>
<table><thead><tr>${sectionHeaderRow}</tr><tr>${qHeaderRow}</tr></thead><tbody>${dataRows}</tbody></table>
<div class="legend"><b>Legend:</b><div class="lg"><div class="lb" style="background:#ffebee"></div>Score &lt; 75% — Needs Improvement</div><div class="lg"><div class="lb" style="background:#e8f5e9"></div>Score ≥ 75% — Good Performance</div></div>
</body></html>`);
        w.document.close();
    };

    const _renderTabularExcel = (rpData) => {
        const escape = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const scoreBg    = v => v === null ? '' : v >= 75 ? 'background:#c8e6c9' : 'background:#ffcdd2';
        const fmt        = v => v === null ? '' : `${v}%`;
        const filtersSuffix = Object.entries(rpData.filters || {}).filter(([,v]) => v).map(([k,v]) => `${k}: ${v}`).join(', ') || 'All';

        const sectionQs = {};
        rpData.questions.forEach(q => {
            if (!sectionQs[q.section_id]) sectionQs[q.section_id] = [];
            sectionQs[q.section_id].push(q);
        });
        const scoringQs    = rpData.questions.filter(q => q.question_type !== 'text' && q.question_type !== 'textarea');
        const nonScoringQs = rpData.questions.filter(q => q.question_type === 'text' || q.question_type === 'textarea');
        const sectionsByOrder = rpData.sections.filter(s => sectionQs[s.id]?.length > 0);
        const nonScSections   = rpData.sections.filter(s => (sectionQs[s.id] || []).some(q => nonScoringQs.find(nsq => nsq.question_id === q.question_id)));
        const idKeys   = rpData.identity_keys || [];
        const scoreKeys = rpData.score_keys  || [];

        let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"><style>
th,td{border:1px solid #bbb;padding:4px 8px;font-size:11px} .hdr{background:#1a237e;color:white;font-weight:bold} .shdr{color:white;font-weight:bold} .chdr{background:#e8eaf6;font-weight:bold} .score-good{background:#c8e6c9;color:#1b5e20;font-weight:bold} .score-bad{background:#ffcdd2;color:#b71c1c;font-weight:bold}</style></head><body>
<table>
<tr><td colspan="99" class="hdr" style="font-size:14px">Department-wise Feedback Analysis Report: ${escape(rpData.form_title)}</td></tr>
<tr><td colspan="99">Filter: ${escape(filtersSuffix)} | Generated: ${new Date().toLocaleString()} | Total Responses: ${rpData.total_responses}</td></tr>
<tr></tr>`;

        // Section headers row
        html += '<tr>';
        html += `<th colspan="${idKeys.length}" class="shdr" style="background:#0d47a1">Response Details</th>`;
        sectionsByOrder.forEach(s => {
            const qs = (sectionQs[s.id] || []).filter(q => scoringQs.find(sq => sq.question_id === q.question_id));
            if (qs.length) html += `<th colspan="${qs.length}" class="shdr" style="background:#1a237e">${escape(s.title)}</th>`;
        });
        const nsTotal = nonScSections.reduce((a, s) => a + (sectionQs[s.id] || []).filter(q => nonScoringQs.find(nsq => nsq.question_id === q.question_id)).length, 0);
        if (nsTotal > 0) html += `<th colspan="${nsTotal}" class="shdr" style="background:#455a64">Non-scoring Sections</th>`;
        if (scoreKeys.length) html += `<th colspan="${scoreKeys.length}" class="shdr" style="background:#e65100">Extra Scores</th>`;
        html += '<th class="shdr" style="background:#0d47a1">Final Score</th><th class="shdr" style="background:#0d47a1">#Responses</th>';
        html += '</tr>';

        // Question sub-headers
        html += '<tr>';
        idKeys.forEach(k => { html += `<th class="chdr">${escape(k.replace(/_/g,' '))}</th>`; });
        sectionsByOrder.forEach(s => {
            (sectionQs[s.id] || []).filter(q => scoringQs.find(sq => sq.question_id === q.question_id)).forEach(q => {
                html += `<th class="chdr" title="${escape(q.question_text)}">${escape(q.question_text)}</th>`;
            });
        });
        nonScSections.forEach(s => {
            (sectionQs[s.id] || []).filter(q => nonScoringQs.find(nsq => nsq.question_id === q.question_id)).forEach(q => {
                html += `<th class="chdr">${escape(q.question_text)}</th>`;
            });
        });
        scoreKeys.forEach(k => { html += `<th class="chdr">${escape(k.replace(/_/g,' '))}</th>`; });
        html += '<th class="chdr">Final Score</th><th class="chdr"># Responses</th>';
        html += '</tr>';

        // Data rows
        rpData.rows.forEach(row => {
            html += '<tr>';
            idKeys.forEach(k => { html += `<td>${escape(row.identity[k] || '')}</td>`; });
            sectionsByOrder.forEach(s => {
                (sectionQs[s.id] || []).filter(q => scoringQs.find(sq => sq.question_id === q.question_id)).forEach(q => {
                    const v = row.question_scores[q.question_id]?.score ?? null;
                    const cls = v === null ? '' : v >= 75 ? 'score-good' : 'score-bad';
                    html += `<td class="${cls}">${fmt(v)}</td>`;
                });
            });
            nonScSections.forEach(s => {
                (sectionQs[s.id] || []).filter(q => nonScoringQs.find(nsq => nsq.question_id === q.question_id)).forEach(q => {
                    html += `<td>${row.question_scores[q.question_id]?.total_responses ?? 0} resp.</td>`;
                });
            });
            scoreKeys.forEach(k => { html += `<td>${escape(row.scores_extra[k] || '')}</td>`; });
            const fs = row.final_score;
            const fsCls = fs === null ? '' : fs >= 75 ? 'score-good' : 'score-bad';
            html += `<td class="${fsCls}">${fmt(fs)}</td><td>${row.response_count}</td>`;
            html += '</tr>';
        });

        html += '</table></body></html>';
        downloadBlob(html, `${rpData.form_title || 'tabular'}_report_${Date.now()}.xls`, 'application/vnd.ms-excel');
    };

    // TD/TH style helpers for print
    const thBoldStyle = (color, bg) => `background:${bg};color:${color};font-weight:800;border:1px solid #bbb;padding:5px 8px;text-align:center`;
    const thStyle     = (bg, color) => `background:${bg};color:${color};border:1px solid #ccc;padding:5px 8px;font-weight:600;text-align:center;font-size:10px`;
    const tdStyle     = ()          => 'border:1px solid #ccc;padding:4px 7px;font-size:10.5px;white-space:nowrap';

    // ── Data helpers ──────────────────────────────────────────────────────────

    const scoringSections   = (analysis?.section_analysis || []).filter(s => s.section_score !== null);
    const nonScoringSections = (analysis?.section_analysis || []).filter(s => s.section_score === null);
    const currentSectionMeta = activeSection !== 'overview'
        ? (analysis?.section_analysis || []).find(s => s.section_id === activeSection)
        : null;
    const currentSectionQuestions = activeSection !== 'overview'
        ? (analysis?.question_analysis || []).filter(q => q.section_id === activeSection)
        : [];

    // ── Sub-renders ───────────────────────────────────────────────────────────

    const renderFilters = () => {
        if (filterFields.length === 0) return null;
        const hasPending = Object.values(pendingFilters).some(v => v?.trim());
        const hasApplied = Object.values(appliedFilters).some(v => v?.trim());
        const isDirty    = JSON.stringify(pendingFilters) !== JSON.stringify(appliedFilters);

        return (
            <div className="fa-filters-bar">
                <div className="fa-filters-head">
                    <div className="fa-filters-head-left">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                        <span className="fa-filters-title">Filter Analysis</span>
                        {hasApplied && (
                            <span className="fa-filter-active-badge">
                                {Object.values(appliedFilters).filter(v => v?.trim()).length} active
                            </span>
                        )}
                    </div>
                    <div className="fa-filters-head-right">
                        {(hasPending || hasApplied) && (
                            <button className="fa-btn-clear" onClick={clearFilters}>&#x2715; Clear All</button>
                        )}
                        <button
                            className={`fa-btn-apply${isDirty ? ' dirty' : ''}`}
                            onClick={applyFilters}
                            disabled={!isDirty}
                        >
                            {isDirty ? '▶ Apply Filters' : '✓ Applied'}
                        </button>
                    </div>
                </div>
                <div className="fa-filters-grid">
                    {filterFields.map(field => {
                        const isCascading = !!field.parent_field;
                        let opts = [];
                        if (isCascading) {
                            const pv = pendingFilters[field.parent_field] || '';
                            opts = pv && field.cascading_options ? (field.cascading_options[pv] || []) : [];
                        } else if (Array.isArray(field.options) && field.options.length > 0) {
                            opts = field.options;
                        }
                        const disabled = isCascading && !pendingFilters[field.parent_field];
                        return (
                            <div key={field.name} className="fa-filter-group">
                                <label>{field.label}</label>
                                {(opts.length > 0 || isCascading) ? (
                                    <select
                                        value={pendingFilters[field.name] || ''}
                                        onChange={e => handleFilterChange(field.name, e.target.value)}
                                        disabled={disabled}
                                    >
                                        <option value="">
                                            {disabled ? `Select ${filterFields.find(f => f.name === field.parent_field)?.label || 'parent'} first` : 'All'}
                                        </option>
                                        {opts.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        placeholder="All"
                                        value={pendingFilters[field.name] || ''}
                                        onChange={e => handleFilterChange(field.name, e.target.value)}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
                {hasApplied && (
                    <div className="fa-filter-chips">
                        <span className="fa-chips-label">Active filters:</span>
                        {Object.entries(appliedFilters).filter(([, v]) => v?.trim()).map(([k, v]) => (
                            <span key={k} className="fa-chip applied">
                                <span className="fa-chip-key">{k}</span>
                                <span className="fa-chip-val">{v}</span>
                                <button onClick={() => {
                                    const next = { ...pendingFilters, [k]: '' };
                                    setPendingFilters(next);
                                    setAppliedFilters(next);
                                }}>&#x2715;</button>
                            </span>
                        ))}
                    </div>
                )}
                {isDirty && hasPending && (
                    <div className="fa-filter-pending-notice">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        Filters changed — click <strong>Apply Filters</strong> to update results.
                    </div>
                )}
            </div>
        );
    };

    const renderReportPanel = () => {
        if (!showReportPanel) return null;
        const isDisabled = !analysis;
        return (
            <div className="fa-report-overlay" onClick={() => setShowReportPanel(false)}>
                <div className="fa-report-panel" onClick={e => e.stopPropagation()}>
                    <div className="fa-report-header">
                        <div className="fa-report-title-row">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                            <h3>Generate Report</h3>
                        </div>
                        <button className="fa-report-close" onClick={() => setShowReportPanel(false)}>&#x2715;</button>
                    </div>

                    {isDisabled && (
                        <div className="fa-report-no-data">No analysis data available. Load analysis first.</div>
                    )}

                    {/* Report scope options */}
                    <div className="fa-report-section">
                        <p className="fa-report-section-label">Include in Report</p>
                        <div className="fa-report-options-grid">
                            {[
                                { key: 'overview',           label: 'Overview & Scores' },
                                { key: 'sections',           label: 'Section Analysis' },
                                { key: 'questions',          label: 'Question Details' },
                                { key: 'sentiment',          label: 'Sentiment Analysis' },
                                { key: 'negative_comments',  label: 'Comments by Sentiment' }
                            ].map(({ key, label }) => (
                                <label key={key} className="fa-report-opt-check">
                                    <input
                                        type="checkbox"
                                        checked={reportOptions[key]}
                                        onChange={e => setReportOptions(prev => ({ ...prev, [key]: e.target.checked }))}
                                    />
                                    <span>{label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Active filter notice */}
                    {Object.values(appliedFilters).some(v => v?.trim()) && (
                        <div className="fa-report-filter-note">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                            Report will reflect current filters: <strong>{getActiveFilterLabel()}</strong>
                        </div>
                    )}

                    {/* Export format buttons - Standard */}
                    <div className="fa-report-section">
                        <p className="fa-report-section-label">Standard Report — Summary View</p>
                        <div className="fa-report-format-grid">
                            <button className="fa-report-fmt-btn print" onClick={openPrintView} disabled={isDisabled}>
                                <div className="fa-fmt-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                                </div>
                                <div className="fa-fmt-info">
                                    <span className="fa-fmt-name">Print / PDF</span>
                                    <span className="fa-fmt-desc">Open print-ready page — save as PDF via browser</span>
                                </div>
                            </button>
                            <button className="fa-report-fmt-btn csv" onClick={() => generateCSV()} disabled={isDisabled}>
                                <div className="fa-fmt-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                                </div>
                                <div className="fa-fmt-info">
                                    <span className="fa-fmt-name">CSV</span>
                                    <span className="fa-fmt-desc">Comma-separated values — opens in Spreadsheets</span>
                                </div>
                            </button>
                            <button className="fa-report-fmt-btn excel" onClick={generateExcel} disabled={isDisabled}>
                                <div className="fa-fmt-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 7l-2 5 2 5M15 7l2 5-2 5M7 12h10"/></svg>
                                </div>
                                <div className="fa-fmt-info">
                                    <span className="fa-fmt-name">Excel (.xls)</span>
                                    <span className="fa-fmt-desc">Formatted spreadsheet — opens in Microsoft Excel</span>
                                </div>
                            </button>
                            <button className="fa-report-fmt-btn json" onClick={generateJSON} disabled={isDisabled}>
                                <div className="fa-fmt-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                                </div>
                                <div className="fa-fmt-info">
                                    <span className="fa-fmt-name">JSON</span>
                                    <span className="fa-fmt-desc">Raw structured data — for developers / integrations</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Tabular / Department-wise report */}
                    <div className="fa-report-section fa-report-tabular-section">
                        <p className="fa-report-section-label">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight:'5px',verticalAlign:'middle'}}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
                            Department / Faculty-wise Tabular Report
                        </p>
                        <p className="fa-report-tabular-desc">
                            Groups all responses by their detail fields (e.g. Faculty, Course, Department) and shows per-question % scores in a color-coded table — <span style={{color:'#b71c1c',fontWeight:600}}>Red &lt; 75%</span>, <span style={{color:'#1b5e20',fontWeight:600}}>Green ≥ 75%</span>.
                        </p>
                        <div className="fa-report-format-grid" style={{marginTop:'0.75rem'}}>
                            <button className="fa-report-fmt-btn tabular-print" onClick={generateTabularPrint}>
                                <div className="fa-fmt-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                                </div>
                                <div className="fa-fmt-info">
                                    <span className="fa-fmt-name">Tabular Print / PDF</span>
                                    <span className="fa-fmt-desc">Department-wise table view — print or save as PDF</span>
                                </div>
                            </button>
                            <button className="fa-report-fmt-btn tabular-excel" onClick={generateTabularExcel}>
                                <div className="fa-fmt-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 7l-2 5 2 5M15 7l2 5-2 5M7 12h10"/></svg>
                                </div>
                                <div className="fa-fmt-info">
                                    <span className="fa-fmt-name">Tabular Excel (.xls)</span>
                                    <span className="fa-fmt-desc">Color-coded spreadsheet with one row per faculty/course</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderOverview = () => {
        if (!analysis) return (
            <div className="fa-empty">
                <p>No responses yet. Share the form to start collecting feedback.</p>
            </div>
        );

        return (
            <>
                {/* ── Top metric cards ── */}
                <div className="fa-metrics-grid">
                    <div className="fa-metric-card overall">
                        <div className="fa-metric-value">
                            {analysis.overall_score !== null && analysis.overall_score !== undefined
                                ? `${analysis.overall_score}%` : 'N/A'}
                        </div>
                        <div className="fa-metric-label">Overall Score</div>
                    </div>
                    <div className="fa-metric-card stat">
                        <div className="fa-metric-value">{analysis.total_responses ?? 0}</div>
                        <div className="fa-metric-label">Total Responses</div>
                    </div>
                    {scoringSections.map(sec => (
                        <div
                            key={sec.section_id}
                            className={`fa-metric-card section-card ${scoreClass(sec.section_score)}`}
                            onClick={() => setActiveSection(sec.section_id)}
                        >
                            <div className="fa-metric-value">{sec.section_score}%</div>
                            <div className="fa-metric-label">{sec.section_title}</div>
                            <div className="fa-metric-hint">View details &#8594;</div>
                        </div>
                    ))}
                </div>

                {/* ── Section performance bars ── */}
                {scoringSections.length > 0 && (
                    <div className="fa-perf-card">
                        <h2 className="fa-section-heading">Section-wise Performance</h2>
                        <div className="fa-section-bars">
                            {scoringSections.map(sec => (
                                <div
                                    key={sec.section_id}
                                    className="fa-bar-item"
                                    onClick={() => setActiveSection(sec.section_id)}
                                >
                                    <div className="fa-bar-header">
                                        <span>{sec.section_title}</span>
                                        <span>{sec.section_score}%</span>
                                    </div>
                                    <div className="fa-progress-track">
                                        <div
                                            className={`fa-progress-fill ${scoreClass(sec.section_score)}`}
                                            style={{ width: `${sec.section_score}%` }}
                                        />
                                    </div>
                                    <div className="fa-bar-footer">
                                        Based on {sec.scoring_question_count} scoring question{sec.scoring_question_count !== 1 ? 's' : ''} &#8594; Click to view
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Non-scoring sections ── */}
                {nonScoringSections.length > 0 && (
                    <div className="fa-perf-card non-scoring">
                        <h2 className="fa-section-heading">Open-Text Sections</h2>
                        <p className="fa-note">These sections contain open-text questions and are excluded from the overall score.</p>
                        <div className="fa-ns-grid">
                            {nonScoringSections.map(sec => (
                                <div
                                    key={sec.section_id}
                                    className="fa-metric-card ns-card"
                                    onClick={() => setActiveSection(sec.section_id)}
                                >
                                    <span className="fa-ns-badge">Open Text</span>
                                    <div className="fa-metric-label" style={{ marginTop: 28 }}>{sec.section_title}</div>
                                    <div className="fa-metric-hint">{sec.total_questions} question{sec.total_questions !== 1 ? 's' : ''} &#8594;</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── AI Sentiment (only when form has text questions) ── */}
                {analysis.has_text_questions && analysis.overall_sentiment !== 'not_applicable' && (() => {
                    // Aggregate all comments from every text question
                    const textQs = (analysis.question_analysis || []).filter(
                        q => q.question_type === 'text' || q.question_type === 'textarea'
                    );
                    const allC  = textQs.flatMap(q => (q.all_comments || []).map(c => ({ ...c, questionText: q.question_text })));
                    const posC  = textQs.flatMap(q => [...(q.positive_comments || []), ...(q.mostly_positive_comments || [])].map(c => ({ ...c, questionText: q.question_text })));
                    const neutC = textQs.flatMap(q => (q.neutral_comments  || []).map(c => ({ ...c, questionText: q.question_text })));
                    const negC  = textQs.flatMap(q => [...(q.negative_comments || []), ...(q.mostly_negative_comments || [])].map(c => ({ ...c, questionText: q.question_text })));
                    const mixC  = textQs.flatMap(q => (q.mixed_comments || []).map(c => ({ ...c, questionText: q.question_text })));

                    const tabs = [
                        { key: 'all',      label: 'All',      count: allC.length,  color: '#546e7a' },
                        { key: 'positive', label: 'Positive', count: posC.length,  color: '#2e7d32' },
                        { key: 'neutral',  label: 'Neutral',  count: neutC.length, color: '#f57c00' },
                        { key: 'negative', label: 'Negative', count: negC.length,  color: '#d32f2f' },
                        ...(mixC.length > 0 ? [{ key: 'mixed', label: 'Mixed', count: mixC.length, color: '#1565c0' }] : []),
                    ];
                    const activeTab = overviewCommentTab;
                    const visibleComments = (() => {
                        if (activeTab === 'all')      return allC;
                        if (activeTab === 'positive') return posC.map(c => ({ ...c, sentiment: 'positive' }));
                        if (activeTab === 'neutral')  return neutC.map(c => ({ ...c, sentiment: 'neutral' }));
                        if (activeTab === 'negative') return negC.map(c => ({ ...c, sentiment: 'negative' }));
                        if (activeTab === 'mixed')    return mixC.map(c => ({ ...c, sentiment: 'mixed' }));
                        return [];
                    })();

                    return (
                        <div className="fa-perf-card">
                            <h2 className="fa-section-heading">AI Sentiment Analysis</h2>
                            <p className="fa-note">Sentiment computed from open-text responses only.</p>
                            <div className="fa-sentiment-overview">
                                <div className="fa-sentiment-badge">
                                    <span className="fa-senti-label">Overall Sentiment</span>
                                    <span
                                        className="fa-senti-value"
                                        style={{ background: SENTIMENT_COLORS[analysis.overall_sentiment] || '#757575' }}
                                    >
                                        {(analysis.overall_sentiment || '').replace(/_/g, ' ')}
                                    </span>
                                </div>
                                {Object.keys(analysis.sentiment_distribution || {}).length > 0 && (
                                    <div className="fa-senti-dist">
                                        {Object.entries(analysis.sentiment_distribution).filter(([, v]) => Number(v) > 0).map(([key, val]) => (
                                            <div
                                                key={key}
                                                className="fa-senti-item"
                                                style={{ borderColor: (SENTIMENT_COLORS[key] || '#ccc') + '55', background: (SENTIMENT_COLORS[key] || '#ccc') + '11', cursor: allC.length > 0 ? 'pointer' : 'default' }}
                                                onClick={() => {
                                                    if (allC.length === 0) return;
                                                    const tabKey = key === 'mostly_positive' ? 'positive' : key === 'mostly_negative' ? 'negative' : key;
                                                    setOverviewCommentTab(tabs.find(t => t.key === tabKey) ? tabKey : 'all');
                                                }}
                                                title={allC.length > 0 ? `Click to filter by ${key.replace(/_/g, ' ')} comments` : ''}
                                            >
                                                <span className="fa-senti-count" style={{ color: SENTIMENT_COLORS[key] || '#555' }}>{val}</span>
                                                <span className="fa-senti-key">{key.replace(/_/g, ' ')}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── Comment viewer ── */}
                            {allC.length > 0 && (
                                <div className="fa-comments-panel" style={{ marginTop: '1.25rem' }}>
                                    <div className="fa-comment-tabs">
                                        {tabs.filter(t => t.count > 0 || t.key === 'all').map(t => (
                                            <button
                                                key={t.key}
                                                className={`fa-comment-tab${activeTab === t.key ? ' active' : ''}`}
                                                style={activeTab === t.key ? { borderColor: t.color, color: t.color, background: t.color + '14' } : {}}
                                                onClick={() => setOverviewCommentTab(t.key)}
                                            >
                                                {t.label}
                                                {t.count > 0 && (
                                                    <span
                                                        className="fa-comment-tab-badge"
                                                        style={{ background: activeTab === t.key ? t.color : '#cfd8dc' }}
                                                    >
                                                        {t.count}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                    {visibleComments.length === 0 ? (
                                        <p className="fa-no-neg" style={{ padding: '0.875rem 1rem', margin: 0 }}>
                                            ✓ No {activeTab} comments.
                                        </p>
                                    ) : (
                                        <ul className="fa-comments-list">
                                            {visibleComments.map((c, ci) => (
                                                <li key={ci} className={`fa-comment-item sent-${c.sentiment || 'neutral'}`}>
                                                    <span className="fa-comment-dot" style={{ background: SENTIMENT_COLORS[c.sentiment] || '#90a4ae' }} />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        {c.questionText && (
                                                            <div className="fa-comment-qtext">{c.questionText}</div>
                                                        )}
                                                        <span className="fa-comment-text">&#8220;{c.text}&#8221;</span>
                                                    </div>
                                                    {activeTab === 'all' && c.sentiment && (
                                                        <span
                                                            className="fa-comment-senti-tag"
                                                            style={{ color: SENTIMENT_COLORS[c.sentiment] || '#546e7a', borderColor: (SENTIMENT_COLORS[c.sentiment] || '#546e7a') + '44' }}
                                                        >
                                                            {c.sentiment.replace(/_/g, ' ')}
                                                        </span>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                            {allC.length === 0 && (
                                <p className="fa-note" style={{ marginTop: '0.875rem' }}>No AI-analysed comments yet — comments are processed in the background after submission.</p>
                            )}
                        </div>
                    );
                })()}
            </>
        );
    };

    const renderSectionDetail = () => {
        if (!currentSectionMeta) return null;
        const isNonScoring = currentSectionMeta.section_score === null;

        return (
            <div className="fa-section-detail">
                <div className="fa-section-detail-header">
                    <button className="fa-back-btn" onClick={() => setActiveSection('overview')}>
                        &#8592; Back to Overview
                    </button>
                    <h2>{currentSectionMeta.section_title}</h2>
                    <div className={`fa-section-score-badge ${isNonScoring ? 'ns' : scoreClass(currentSectionMeta.section_score)}`}>
                        {isNonScoring
                            ? 'Open Text'
                            : `Score: ${currentSectionMeta.section_score}%`}
                    </div>
                </div>

                <div className="fa-questions-wrap">
                    <div className="fa-questions-grid">
                        {currentSectionQuestions.length === 0 && (
                            <p className="fa-empty">No questions in this section.</p>
                        )}
                        {currentSectionQuestions.map((q, idx) => {
                            const isText = q.question_type === 'text' || q.question_type === 'textarea';
                            const optEntries = Object.entries(q.option_distribution || {});
                            const totalCount = optEntries.reduce((s, [, c]) => s + Number(c), 0) || q.total_responses || 1;

                            return (
                                <div key={q.question_id || idx} className="fa-question-card">
                                    <div className="fa-q-header">
                                        <span className="fa-q-num">Q{idx + 1}</span>
                                        <span className={`fa-q-type type-${q.question_type}`}>{q.question_type}</span>
                                        {!isText && q.question_score !== null && (
                                            <span className={`fa-q-score ${scoreClass(q.question_score)}`}>
                                                {q.question_score}%
                                            </span>
                                        )}
                                        {isText && <span className="fa-ai-badge">AI Analysed</span>}
                                    </div>
                                    <p className="fa-q-text">{q.question_text}</p>

                                    {/* Stats row */}
                                    <div className="fa-q-stats">
                                        <span>{q.total_responses} responses</span>
                                        {q.average_rating != null && (
                                            <span>Avg: {parseFloat(q.average_rating).toFixed(1)} / {form?.sections?.flatMap(s => s.questions)?.find(fq => fq.id === q.question_id)?.max_score || 5}</span>
                                        )}
                                    </div>

                                    {/* Choice questions: response distribution bars */}
                                    {!isText && optEntries.length > 0 && (
                                        <div className="fa-responses">
                                            {optEntries.map(([option, count], oi) => {
                                                const pct = totalCount > 0 ? Math.round((Number(count) / totalCount) * 100) : 0;
                                                // Determine color: for 3-option scales use position, else use score comparison
                                                const colorIdx = optEntries.length === 3
                                                    ? (oi === 0 ? 'danger' : oi === 1 ? 'warning' : 'success')
                                                    : scoreClass(pct);
                                                const interpretLabel = optEntries.length === 3
                                                    ? (oi === 0 ? 'Poor' : oi === 1 ? 'Neutral' : 'Good')
                                                    : null;
                                                return (
                                                    <div key={option} className="fa-resp-item">
                                                        <div className="fa-resp-header">
                                                            <span className="fa-resp-text">
                                                                {option}
                                                                {interpretLabel && (
                                                                    <span className={`fa-interp ${colorIdx}`}>{interpretLabel}</span>
                                                                )}
                                                            </span>
                                                            <span className="fa-resp-count">({count})</span>
                                                            <span className={`fa-resp-pct ${colorIdx}`}>{pct}%</span>
                                                        </div>
                                                        <div className="fa-resp-track">
                                                            <div className={`fa-resp-fill ${colorIdx}`} style={{ width: `${pct}%` }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* Optional recharts fallback for wide distributions */}
                                            {hasRecharts && optEntries.length > 6 && (
                                                <ResponsiveContainer width="100%" height={Math.max(140, optEntries.length * 34)}>
                                                    <BarChart
                                                        layout="vertical"
                                                        data={optEntries.map(([o, c]) => ({ option: o, count: Number(c) }))}
                                                        margin={{ left: 8, right: 24 }}
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis type="number" allowDecimals={false} />
                                                        <YAxis type="category" dataKey="option" width={150} tick={{ fontSize: 11 }} />
                                                        <Tooltip />
                                                        <Bar dataKey="count" fill="#1a237e" radius={[0, 4, 4, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            )}
                                        </div>
                                    )}

                                    {/* Text questions: sentiment-categorised comments */}
                                    {isText && (() => {
                                        const allC      = q.all_comments || [];
                                        const posC      = [...(q.positive_comments || []), ...(q.mostly_positive_comments || [])];
                                        const neutC     = q.neutral_comments || [];
                                        const negC      = [...(q.negative_comments || []), ...(q.mostly_negative_comments || [])];
                                        const mixC      = q.mixed_comments || [];
                                        const hasAny    = allC.length > 0;
                                        const activeTab = commentTabs[q.question_id] || 'all';
                                        const tabs = [
                                            { key: 'all',      label: 'All',      count: allC.length,  color: '#546e7a' },
                                            { key: 'positive', label: 'Positive', count: posC.length,  color: '#2e7d32' },
                                            { key: 'neutral',  label: 'Neutral',  count: neutC.length, color: '#f57c00' },
                                            { key: 'negative', label: 'Negative', count: negC.length,  color: '#d32f2f' },
                                            ...(mixC.length > 0 ? [{ key: 'mixed', label: 'Mixed', count: mixC.length, color: '#1565c0' }] : []),
                                        ];
                                        const visibleComments = (() => {
                                            if (activeTab === 'all')      return allC.map(c => ({ text: c.text, sentiment: c.sentiment }));
                                            if (activeTab === 'positive') return posC.map(c => ({ text: c.text, sentiment: 'positive' }));
                                            if (activeTab === 'neutral')  return neutC.map(c => ({ text: c.text, sentiment: 'neutral' }));
                                            if (activeTab === 'negative') return negC.map(c => ({ text: c.text, sentiment: 'negative' }));
                                            if (activeTab === 'mixed')    return mixC.map(c => ({ text: c.text, sentiment: 'mixed' }));
                                            return [];
                                        })();

                                        return (
                                            <div className="fa-comments-panel">
                                                {!hasAny ? (
                                                    <p className="fa-no-neg">
                                                        {q.total_responses > 0
                                                            ? '✓ No AI-analysed comments for this question.'
                                                            : 'No responses yet.'}
                                                    </p>
                                                ) : (
                                                    <>
                                                        <div className="fa-comment-tabs">
                                                            {tabs.filter(t => t.count > 0 || t.key === 'all').map(t => (
                                                                <button
                                                                    key={t.key}
                                                                    className={`fa-comment-tab${activeTab === t.key ? ' active' : ''}`}
                                                                    style={activeTab === t.key ? { borderColor: t.color, color: t.color, background: t.color + '14' } : {}}
                                                                    onClick={() => setCommentTabs(prev => ({ ...prev, [q.question_id]: t.key }))}
                                                                >
                                                                    {t.label}
                                                                    {t.count > 0 && (
                                                                        <span
                                                                            className="fa-comment-tab-badge"
                                                                            style={{ background: activeTab === t.key ? t.color : '#cfd8dc' }}
                                                                        >
                                                                            {t.count}
                                                                        </span>
                                                                    )}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        {visibleComments.length === 0 ? (
                                                            <p className="fa-no-neg">✓ No {activeTab} comments.</p>
                                                        ) : (
                                                            <ul className="fa-comments-list">
                                                                {visibleComments.map((c, ci) => (
                                                                    <li key={ci} className={`fa-comment-item sent-${c.sentiment || 'neutral'}`}>
                                                                        <span className="fa-comment-dot" style={{ background: SENTIMENT_COLORS[c.sentiment] || '#90a4ae' }} />
                                                                        <span className="fa-comment-text">&#8220;{c.text}&#8221;</span>
                                                                        {activeTab === 'all' && c.sentiment && (
                                                                            <span
                                                                                className="fa-comment-senti-tag"
                                                                                style={{ color: SENTIMENT_COLORS[c.sentiment] || '#546e7a', borderColor: (SENTIMENT_COLORS[c.sentiment] || '#546e7a') + '44' }}
                                                                            >
                                                                                {c.sentiment.replace(/_/g, ' ')}
                                                                            </span>
                                                                        )}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    // ── Loading & empty states ────────────────────────────────────────────────

    if (loading && !form) {
        return (
            <div className="fa-full-loading">
                <div className="fa-spinner"></div>
                <p>Loading analysis...</p>
            </div>
        );
    }

    // ── Main render ───────────────────────────────────────────────────────────

    return (
        <div className="fa-container">

            {/* ─── Professional Header ─── */}
            <div className="fa-pro-header">
                <div className="fa-pro-top">
                    <div className="fa-pro-branding">
                        <div className="fa-form-avatar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10 9 9 9 8 9"/>
                            </svg>
                        </div>
                        <div>
                            <h1 className="fa-form-title">{form?.title || 'Form Analysis'}</h1>
                            <p className="fa-form-sub">Response Analytics Dashboard</p>
                        </div>
                    </div>
                    <div className="fa-pro-actions">
                        <button onClick={() => navigate(`/forms/${formId}/responses`)} className="fa-hdr-btn secondary">
                            View Responses
                        </button>
                        <button onClick={loadAnalysis} className="fa-hdr-btn primary" disabled={loading}>
                            {loading ? 'Loading...' : 'Refresh'}
                        </button>
                        <button
                            onClick={() => setShowReportPanel(true)}
                            className="fa-hdr-btn report"
                            disabled={!analysis}
                            title={!analysis ? 'Load analysis first' : 'Generate & download report'}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight:'6px',verticalAlign:'middle'}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Generate Report
                        </button>
                        <button onClick={() => navigate('/dashboard')} className="fa-hdr-btn back">
                            &#8592; Dashboard
                        </button>
                    </div>
                </div>

                {/* Form info row */}
                <div className="fa-info-row">
                    <div className="fa-info-item">
                        <div className="fa-info-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                        </div>
                        <div className="fa-info-content">
                            <span className="fa-info-label">Total Responses</span>
                            <span className="fa-info-value">{analysis?.total_responses ?? '—'}</span>
                        </div>
                    </div>
                    <div className="fa-info-item">
                        <div className="fa-info-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                            </svg>
                        </div>
                        <div className="fa-info-content">
                            <span className="fa-info-label">Overall Score</span>
                            <span className="fa-info-value">
                                {analysis?.overall_score != null ? `${analysis.overall_score}%` : '—'}
                            </span>
                        </div>
                    </div>
                    <div className="fa-info-item">
                        <div className="fa-info-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                            </svg>
                        </div>
                        <div className="fa-info-content">
                            <span className="fa-info-label">Sections</span>
                            <span className="fa-info-value">{form?.sections?.length ?? '—'}</span>
                        </div>
                    </div>
                    {analysis?.has_text_questions && analysis.overall_sentiment !== 'not_applicable' && (
                        <div className="fa-info-item">
                            <div className="fa-info-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                </svg>
                            </div>
                            <div className="fa-info-content">
                                <span className="fa-info-label">Sentiment</span>
                                <span className="fa-info-value" style={{ color: SENTIMENT_COLORS[analysis.overall_sentiment] || '#555', textTransform: 'capitalize' }}>
                                    {(analysis.overall_sentiment || '').replace(/_/g, ' ')}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Main Content ─── */}
            <main className="fa-main">

                {/* Filters */}
                {renderFilters()}

                {loading ? (
                    <div className="fa-inline-loading">
                        <div className="fa-spinner"></div>
                        <p>Analyzing responses...</p>
                    </div>
                ) : activeSection === 'overview' ? (
                    renderOverview()
                ) : (
                    renderSectionDetail()
                )}
            </main>

            {/* Report generation panel (modal overlay) */}
            {renderReportPanel()}
        </div>
    );
};

export default FormAnalysis;