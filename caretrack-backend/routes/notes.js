const express = require('express');
const router = express.Router();
const { Note } = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.put('/:noteId', authenticateToken, async (req, res) => {
  const { noteId } = req.params;
  const { content } = req.body;

  if (!content || content.trim() === '') {
      return res.status(400).json({ success: false, message: 'Note content cannot be empty' });
  }

  try {
      const note = await Note.findOne({ where: { id: noteId } });

      if (!note) {
          return res.status(404).json({ success: false, message: 'Note not found' });
      }

      if (note.doctorId !== req.user.id) {
          return res.status(403).json({ success: false, message: 'Unauthorized to edit this note' });
      }

      note.content = content;
      await note.save();

      return res.json({ success: true, note });

  } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error updating note' });
  }
});

router.delete('/:noteId', authenticateToken, async (req, res) => {
  const { noteId } = req.params;

  try {
      const deleted = await Note.destroy({
          where: { id: noteId, doctorId: req.user.id }
      });

      if (deleted) {
          return res.json({ success: true, message: 'Note deleted successfully' });
      } else {
          return res.status(404).json({ success: false, message: 'Note not found or unauthorized' });
      }
  } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error deleting note' });
  }
});

module.exports = router;
