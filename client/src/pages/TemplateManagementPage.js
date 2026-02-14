import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../AuthContext'; 
import { useNavigate } from 'react-router-dom';

function TemplateManagementPage() {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    
    // State for data and loading
    const [templates, setTemplates] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    // State for the Create Form
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');

    // State for the Edit Modal
    const [editingTemplate, setEditingTemplate] = useState(null); 
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');


    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:4000/templates', {
                headers: { Authorization: `Bearer ${user.token}` },
            });
            const data = await res.json();
            if (data.success) {
                setTemplates(data.templates);
            }
        } catch (err) {
            setError('Failed to fetch templates.');
        } finally {
            setLoading(false);
        }
    }, [user.token]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);


    const handleCreateTemplate = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!newTitle.trim() || !newContent.trim()) {
            setError('Title and content cannot be empty.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('http://localhost:4000/templates', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user.token}` 
                },
                body: JSON.stringify({ title: newTitle, content: newContent }),
            });
            
            const data = await res.json();
            
            if (data.success) {
                alert('Template created successfully!');
                setNewTitle('');
                setNewContent('');
                fetchTemplates(); // Refresh the list
            } else {
                setError(data.message || 'Failed to create template.');
            }
        } catch (err) {
            setError('Server error during template creation.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTemplate = async (id) => {
        if (!window.confirm('WARNING: Are you sure you want to delete this template? All assigned patient forms will be deleted too.')) {
            return;
        }
        try {
            const res = await fetch(`http://localhost:4000/templates/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${user.token}` },
            });
            
            if (res.ok) {
                alert('Template deleted.');
                fetchTemplates();
            } else {
                const data = await res.json();
                alert(data.message || 'Failed to delete template.');
            }
        } catch (err) {
            setError('Server error during deletion.');
        }
    };
    
    // Handler to open the modal and load the template's current data
    const handleStartEdit = (template) => {
        setEditingTemplate(template);
        setEditTitle(template.title);
        setEditContent(template.content);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        setError('');

        if (!editTitle.trim() || !editContent.trim()) {
            setError('Title and content cannot be empty.');
            return;
        }
        
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:4000/templates/${editingTemplate.id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user.token}` 
                },
                body: JSON.stringify({ title: editTitle, content: editContent }),
            });
            
            if (res.ok) {
                alert('Template updated successfully!');
                setEditingTemplate(null); // Close the editor
                fetchTemplates(); // Refresh the list
            } else {
                const data = await res.json();
                setError(data.message || 'Failed to update template.');
            }
        } catch (err) {
            setError('Server error during update.');
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="container" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px',color: '#2f3b52', backgroundColor: '#f5f5f5', padding: '10px 15px', borderRadius: '8px' }}>
                <h1> Agreement Templates</h1>
                <button 
                    onClick={() => navigate(-1)} 
                    className="btn-primary" 
                >
                    &larr; Go Back
                </button>
            </div>
            
            {error && <p style={{ color: 'red', marginBottom: '15px' }}>{error}</p>}
            
            <div style={{ display: 'flex', gap: '30px' }}>
                
                {/* ⭐️ COLUMN 1: CREATE NEW TEMPLATE ⭐️ */}
                <div style={{ flex: 1 }}>
                    <div className="patient-card">
                        <h3 className="card-title">➕ Create New Template</h3>
                        <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '20px' }}>Define the standard text for patient agreements or consent forms.</p>
                        
                        <form onSubmit={handleCreateTemplate}>
                            <input
                                type="text"
                                placeholder="Template Title (e.g., Patient Intake Form)"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ddd' }}
                                required
                            />
                            <textarea
                                placeholder="Template Content (This will be the default text for all new agreements.)"
                                value={newContent}
                                onChange={(e) => setNewContent(e.target.value)}
                                rows="10"
                                style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '5px', border: '1px solid #ddd', resize: 'vertical' }}
                                required
                            />
                            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%' }}>
                                {loading ? 'Saving...' : 'Save New Template'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* ⭐️ COLUMN 2: TEMPLATE LIST ⭐️ */}
                <div style={{ flex: 1.5 }}>
                    <div className="patient-card">
                        <h3 className="card-title">Existing Templates ({templates.length})</h3>
                        {loading && <p>Loading templates...</p>}
                        
                        <ul style={{ listStyleType: 'none', padding: 0 }}>
                            {templates.length === 0 && !loading && <p style={{ color: '#888' }}>No templates found. Create one to get started.</p>}
                            {templates.map(t => (
                                <li key={t.id} style={{ borderBottom: '1px solid #eee', padding: '12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                        <strong>{t.title}</strong>
                                        <p style={{ fontSize: '0.9em', color: '#555', marginTop: '3px' }}>
                                            Version {t.version} | ID: {t.id}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        {/* EDIT ICON BUTTON */}
                                        <button 
                                            onClick={() => handleStartEdit(t)} 
                                            className="icon-button edit-btn" 
                                            title="Edit Template"
                                        >
                                            <span>✏️</span> 
                                        </button>
                                        {/* DELETE ICON BUTTON */}
                                        <button 
                                            onClick={() => handleDeleteTemplate(t.id)} 
                                            className="icon-button delete-btn" 
                                            title="Delete Template"
                                        >
                                            <span>🗑️</span> 
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

            </div>

            {/* ⭐️ EDIT MODAL COMPONENT ⭐️ */}
            {editingTemplate && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ width: '600px' }}>
                        <h3>Edit Template: {editingTemplate.title}</h3>
                        <form onSubmit={handleSaveEdit}>
                            <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                                required
                            />
                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                rows="12"
                                style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ddd', resize: 'vertical' }}
                                required
                            />
                            {error && <p style={{ color: 'red' }}>{error}</p>}
                            <button type="submit" disabled={loading} className="btn-primary">
                                Save Changes
                            </button>
                            <button type="button" onClick={() => setEditingTemplate(null)} className="btn-secondary" style={{ marginLeft: '10px' }}>
                                Cancel
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}

export default TemplateManagementPage;