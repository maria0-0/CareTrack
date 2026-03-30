import React, { useState } from 'react';
import API_URL from '../../apiConfig';

function GeneralNotes({ patient, user, onRefresh }) {
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editNoteText, setEditNoteText] = useState('');

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!user || !user.token) return alert("Authentication failed. Please log in again.");
    if (!newNoteContent.trim()) return;

    try {
      const res = await fetch(`${API_URL}/patients/${patient.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ content: newNoteContent }),
      });
      const data = await res.json();
      if (data.success) {
        setNewNoteContent('');
        onRefresh();
      } else {
        alert(data.message || 'Failed to add note');
      }
    } catch (err) {
      alert('Server error adding note: ' + err.message);
    }
  };

  const handleStartEditNote = (note) => {
    setEditingNoteId(note.id);
    setEditNoteText(note.content);
  };

  const handleSaveNote = async (noteId) => {
    if (!user || !user.token) return;
    if (!editNoteText.trim()) return alert('Note content cannot be empty.');

    try {
      const res = await fetch(`http://localhost:4000/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ content: editNoteText }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEditingNoteId(null);
        setEditNoteText('');
        onRefresh();
      } else {
        alert(data.message || 'Failed to update note.');
      }
    } catch (err) {
      alert('Server error saving note: ' + err.message);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!user || !user.token) return;
    if (!window.confirm('Are you sure you want to delete this general note?')) return;

    try {
      const res = await fetch(`http://localhost:4000/notes/${noteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to delete note.');
      }
    } catch (err) {
      alert('Server error deleting note: ' + err.message);
    }
  };

  return (
    <section className="patient-card">
      <h3 className="card-title">General Patient Notes</h3>
      <form onSubmit={handleAddNote} style={{ marginBottom: '15px' }}>
        <textarea
          value={newNoteContent}
          onChange={(e) => setNewNoteContent(e.target.value)}
          placeholder="Add a general note..."
          rows="3"
          style={{ width: '100%', padding: '8px', marginBottom: '5px' }}
          required
        />
        <button type="submit">Save General Note</button>
      </form>

      {(patient.Notes || []).length > 0 ? (
        <ul className="notes-list">
          {(patient.Notes || []).map((note) => (
            <li key={note.id} className={editingNoteId === note.id ? "note-item editing" : "note-item"}>
              <div className="note-content">
                {editingNoteId === note.id ? (
                  <textarea
                    value={editNoteText}
                    onChange={(e) => setEditNoteText(e.target.value)}
                    style={{ width: '100%', minHeight: '100px', marginBottom: '10px' }}
                  />
                ) : (
                  <p style={{ whiteSpace: 'pre-wrap' }}>{note.content}</p>
                )}
                <small style={{ color: '#888' }}>Last Updated: {new Date(note.updatedAt).toLocaleString()}</small>
              </div>

              {editingNoteId === note.id ? (
                <div className="note-actions">
                  <button onClick={() => handleSaveNote(note.id)} className="btn-primary">Save</button>
                  <button onClick={() => setEditingNoteId(null)} className="btn-secondary">Cancel</button>
                </div>
              ) : (
                <div className="note-actions">
                  <button onClick={() => handleStartEditNote(note)} className="btn-primary">Edit</button>
                  <button onClick={() => handleDeleteNote(note.id)} className="btn-danger">Delete</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No general notes yet.</p>
      )}
    </section>
  );
}

export default GeneralNotes;
