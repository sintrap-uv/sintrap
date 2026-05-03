import { StyleSheet } from 'react-native';
import theme from '../constants/theme';

const T = theme.lightMode;

export const asignarRecursosStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: {
    backgroundColor: T.Button.primary.background,
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: T.Button.primary.background },
  tabText: { fontSize: 14, color: '#6B7280' },
  tabTextActive: { color: T.Button.primary.background, fontWeight: '600' },
  
  content: { flex: 1, padding: 16 },
  
  datePickerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', color: T.text.secondary },
  dateButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  dateText: { fontSize: 14, color: T.text.primary },
  
  sectionTitle: { fontSize: 16, fontWeight: '600', color: T.text.primary, marginBottom: 12, marginTop: 8 },
  
  turnoCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  turnoCardSelected: { borderColor: T.Button.primary.background, backgroundColor: '#F0FDF4' },
  turnoCardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  turnoCheckbox: { width: 24 },
  turnoCardNombre: { fontSize: 16, fontWeight: '500', color: T.text.primary },
  turnoCardHorario: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  
  vehiculoCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  vehiculoHeader: { marginBottom: 12 },
  turnoNombre: { fontSize: 14, fontWeight: '600', color: T.text.primary },
  turnoHorario: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  vehiculoInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vehiculoPlaca: { fontSize: 15, fontWeight: '600', color: T.text.primary },
  vehiculoDetalle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  cambiarBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: '#F3F4F6' },
  cambiarBtnText: { fontSize: 13, color: T.Button.primary.background },
  asignarBtn: { borderWidth: 1, borderColor: T.Button.primary.background, borderStyle: 'dashed', borderRadius: 8, padding: 12, alignItems: 'center' },
  asignarBtnText: { color: T.Button.primary.background, fontWeight: '500' },
  
  capacidadCard: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 12, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between' },
  capacidadText: { fontSize: 14, fontWeight: '500' },
  
  agregarUsuarioBtn: { backgroundColor: T.Button.primary.background, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
  agregarUsuarioBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  
  usuarioCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  usuarioInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  usuarioAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E0E7FF', alignItems: 'center', justifyContent: 'center' },
  usuarioAvatarText: { fontSize: 18, fontWeight: '600', color: T.Button.primary.background },
  usuarioNombre: { fontSize: 15, fontWeight: '500', color: T.text.primary },
  usuarioCedula: { fontSize: 12, color: '#6B7280' },
  
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyStateText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  
  footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  guardarBtn: { backgroundColor: T.Button.primary.background, borderRadius: 12, padding: 16, alignItems: 'center' },
  guardarBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: T.text.primary, marginBottom: 16 },
  modalSubtitle: { fontSize: 14, fontWeight: '600', color: T.text.primary, marginTop: 12, marginBottom: 8 },
  modalItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalItemSelected: { backgroundColor: '#F0FDF4' },
  modalItemWarning: { backgroundColor: '#FEF2F2', borderLeftWidth: 3, borderLeftColor: '#EF4444' },
  modalItemTitle: { fontSize: 15, fontWeight: '500', color: T.text.primary },
  modalItemSub: { fontSize: 12, color: '#6B7280' },
  modalCloseBtn: { marginTop: 16, padding: 12, alignItems: 'center', borderRadius: 8, backgroundColor: '#F3F4F6' },
  modalCloseBtnText: { color: T.text.primary, fontWeight: '500' },
  searchInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 12 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: '#F3F4F6' },
  modalBtnCancelText: { color: '#6B7280' },
  modalBtnConfirm: { backgroundColor: T.Button.primary.background },
  modalBtnConfirmText: { color: '#fff', fontWeight: '500' },
  emptyText: { textAlign: 'center', padding: 20, color: '#9CA3AF' },
  
  vehiculoAcciones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eliminarBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  limpiarTodoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  limpiarTodoBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
  },
});