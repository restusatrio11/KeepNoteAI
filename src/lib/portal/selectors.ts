export const SELECTORS = {
  addButton: 'button.ant-btn:has(i.anticon-plus, i.anticon-add)',
  modalTitle: '.ant-modal-title',
  modalTitleText: 'Add Capaian Kegiatan Perhari',

  rencanaKinerja: '#form-add_rencanaKinerja',
  rencanaKinerjaInput: '#form-add_rencanaKinerja input.ant-select-search__field',

  usePeriodCheckbox: 'label:has-text("Gunakan periode tanggal") input[type="checkbox"]',
  useTimeCheckbox: 'label:has-text("Gunakan jam") input[type="checkbox"]',

  datePicker: '.ant-calendar-picker',
  datePickerInput: '.ant-calendar-picker-input',

  kegiatan: '#form-add_kegiatan',
  progres: '#form-add_progres input',
  capaian: '#form-add_capaian',
  dataDukung: '#form-add_dataDukung',

  saveButton: '.ant-modal-footer button.ant-btn-primary',

  // feedback
  successMessage: '.ant-message-success, .ant-notification-notice-success',
  errorMessage: '.ant-message-error, .ant-notification-notice-error',
} as const;
