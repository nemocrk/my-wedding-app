import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem, Box, Chip, Typography, RadioGroup, FormControlLabel, Radio, CircularProgress, Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';

const BulkLabelModal = ({ open, onClose, selectedIds, onSuccess }) => {
  const { t } = useTranslation();
  const [labels, setLabels] = useState([]);
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [action, setAction] = useState('add'); // 'add' or 'remove'
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      fetchLabels();
      // Reset state on open
      setSelectedLabels([]);
      setAction('add');
      setError(null);
    }
  }, [open]);

  const fetchLabels = async () => {
    setLoading(true);
    try {
      const data = await api.fetchInvitationLabels();
      setLabels(data);
    } catch (err) {
      console.error("Error fetching labels:", err);
      setError(t('admin.common.error_loading_data'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedLabels.length === 0) return;

    setSubmitting(true);
    setError(null);
    try {
      await api.bulkManageLabels(selectedIds, selectedLabels, action);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Error bulk updating labels:", err);
      setError(t('admin.common.error_generic'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLabelChange = (event) => {
    const {
      target: { value },
    } = event;
    setSelectedLabels(
      // On autofill we get a stringified value.
      typeof value === 'string' ? value.split(',') : value,
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('admin.invitations.bulk_labels.title')}</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" gap={3}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            
            <Typography variant="body2" color="text.secondary">
              {t('admin.invitations.bulk_labels.subtitle', { count: selectedIds.length })}
            </Typography>

            <FormControl component="fieldset">
              <Typography variant="subtitle2" gutterBottom>
                {t('admin.invitations.bulk_labels.action_label')}
              </Typography>
              <RadioGroup
                row
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                <FormControlLabel 
                  value="add" 
                  control={<Radio />} 
                  label={t('admin.invitations.bulk_labels.action_add')} 
                />
                <FormControlLabel 
                  value="remove" 
                  control={<Radio />} 
                  label={t('admin.invitations.bulk_labels.action_remove')} 
                />
              </RadioGroup>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="bulk-label-select-label">{t('admin.invitations.labels')}</InputLabel>
              <Select
                labelId="bulk-label-select-label"
                multiple
                value={selectedLabels}
                onChange={handleLabelChange}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                       const labelObj = labels.find(l => l.id === value);
                       return (
                         <Chip 
                            key={value} 
                            label={labelObj ? labelObj.name : value} 
                            size="small"
                            style={{ 
                                backgroundColor: labelObj?.color || '#e0e0e0',
                                color: labelObj?.color ? '#fff' : 'inherit'
                            }}
                         />
                       );
                    })}
                  </Box>
                )}
              >
                {labels.map((label) => (
                  <MenuItem key={label.id} value={label.id}>
                    {label.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          {t('admin.common.cancel')}
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={submitting || selectedLabels.length === 0}
          color="primary"
        >
           {submitting ? <CircularProgress size={24} /> : t('admin.common.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkLabelModal;
