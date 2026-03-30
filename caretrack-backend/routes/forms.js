const express = require('express');
const router = express.Router();
const { FormTemplate, PatientForm, Patient } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { uploadBase64ToS3 } = require('../utils/s3Upload');



router.post('/patients/:patientId/assign', authenticateToken, async (req, res) => {
    const { patientId } = req.params;
    const { templateId } = req.body;
    const doctorId = req.user.id;
  
    try {
        const template = await FormTemplate.findOne({ where: { id: templateId, doctorId } });
        const patient = await Patient.findOne({ where: { id: patientId, doctorId } });

        if (!template || !patient) return res.status(404).json({ success: false, message: 'Data not found.' });
  
        let dynamicContent = template.content;
        
        // Logica de înlocuire
        const replacements = {
            '{{PATIENT_NAME}}': patient.name || '____________________',
            '{{PATIENT_AGE}}': patient.age ? `${patient.age} ani` : '____ ani',
            '{{PATIENT_BIRTHDAY}}': patient.birthday ? new Date(patient.birthday).toLocaleDateString('ro-RO') : '____/____/________',
            '{{PATIENT_PHONE}}': patient.phone || '____________________',
            '{{CURRENT_DATE}}': new Date().toLocaleDateString('ro-RO'),
            '{{DOCTOR_SIGNATURE}}': `[Semnat Electronic de Dr. ${req.user.lastName}]`,
            '[ ]': '[ ] DA   [ ] NU' 
        };

        Object.keys(replacements).forEach(key => {
            dynamicContent = dynamicContent.split(key).join(replacements[key]);
        });

       

        const newPatientForm = await PatientForm.create({
            patientId,
            templateId,
            title: template.title,
            content: dynamicContent, 
            completedContent: dynamicContent, 
            status: 'PENDING',
            doctorId
        });

        res.status(201).json({ success: true, form: newPatientForm });
    } catch (error) {
        console.error("Assign Error:", error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

router.get('/templates', authenticateToken, async (req, res) => {
  try {
      const templates = await FormTemplate.findAll({ where: { doctorId: req.user.id } });
      res.json({ success: true, templates });
  } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ success: false, message: 'Server error fetching templates.' });
  }
});

router.post('/templates', authenticateToken, async (req, res) => {
  const { title, content } = req.body;
  const doctorId = req.user.id;

  if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required for a template.' });
  }

  try {
      const newTemplate = await FormTemplate.create({ title, content, doctorId });
      res.status(201).json({ success: true, template: newTemplate });
  } catch (error) {
      console.error('Error creating template:', error);
      res.status(500).json({ success: false, message: 'Server error creating template.' });
  }
});

router.get('/templates/:templateId', authenticateToken, async (req, res) => {
  const { templateId } = req.params;
  const doctorId = req.user.id;

  try {
      const template = await FormTemplate.findOne({ where: { id: templateId, doctorId } });
      if (!template) return res.status(404).json({ success: false, message: 'Template not found.' });
      
      res.json({ success: true, template });
  } catch (error) {
      console.error('Error fetching template:', error);
      res.status(500).json({ success: false, message: 'Server error fetching template.' });
  }
});

router.put('/templates/:templateId', authenticateToken, async (req, res) => {
  const { templateId } = req.params;
  const { title, content } = req.body;
  const doctorId = req.user.id;

  if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required.' });
  }

  try {
      const [updated] = await FormTemplate.update(
          { title, content },
          { where: { id: templateId, doctorId: doctorId } }
      );

      if (updated) {
          const updatedTemplate = await FormTemplate.findByPk(templateId);
          return res.json({ success: true, template: updatedTemplate });
      }
      res.status(404).json({ success: false, message: 'Template not found or unauthorized.' });
  } catch (error) {
      console.error('Error updating template:', error);
      res.status(500).json({ success: false, message: 'Server error updating template.' });
  }
});

router.delete('/templates/:templateId', authenticateToken, async (req, res) => {
  const { templateId } = req.params;
  const doctorId = req.user.id;

  try {
      const deleted = await FormTemplate.destroy({
          where: { id: templateId, doctorId: doctorId }
      });

      if (deleted) {
          return res.json({ success: true, message: 'Template successfully deleted.' });
      }
      res.status(404).json({ success: false, message: 'Template not found or unauthorized.' });
  } catch (error) {
      console.error('Error deleting template:', error);
      res.status(500).json({ success: false, message: 'Server error deleting template.' });
  }
});

router.put('/:formId/complete', authenticateToken, async (req, res) => {
  const { formId } = req.params;
  const { completedContent, signature } = req.body; 
  const doctorId = req.user.id;

  if (!completedContent) {
      return res.status(400).json({ success: false, message: 'Completed content is required.' });
  }

  try {
      const patientForm = await PatientForm.findOne({ where: { id: formId, doctorId } });
      if (!patientForm) return res.status(404).json({ success: false, message: 'Form not found or unauthorized.' });

      // Handle signature upload to S3 if it's a base64 string
      let signatureUrl = signature;
      if (signatureUrl && signatureUrl.startsWith('data:image')) {
          signatureUrl = await uploadBase64ToS3(signatureUrl, `signatures/patient-form-${formId}`);
      }

      patientForm.completedContent = completedContent;
      patientForm.signature = signatureUrl;
      patientForm.status = 'COMPLETED';
      await patientForm.save();

      res.json({ success: true, form: patientForm });
  } catch (error) {
      console.error('Error completing form:', error);
      res.status(500).json({ success: false, message: 'Server error completing form.' });
  }
});

router.delete('/:formId', authenticateToken, async (req, res) => {
  const { formId } = req.params;
  const doctorId = req.user.id;

  try {
      const deleted = await PatientForm.destroy({
          where: { id: formId, doctorId: doctorId }
      });

      if (deleted) {
          return res.json({ success: true, message: 'Patient form instance successfully deleted.' });
      }
      res.status(404).json({ success: false, message: 'Patient form not found or unauthorized.' });
  } catch (error) {
      console.error('Error deleting patient form:', error);
      res.status(500).json({ success: false, message: 'Server error deleting patient form.' });
  }
});

module.exports = router;
