import { updateAppointmentStatus, updateRequestStatus } from '@/app/desk/actions'
import { requestStatuses, statusLabels, type RequestStatus } from '@/lib/forms'

export function RequestStatusForm({ requestId, status }: { requestId: string; status: string }) {
  return <form action={updateRequestStatus} className="desk-status-form">
    <input type="hidden" name="requestId" value={requestId} />
    <label className="crm-field"><span>Update request status</span><select name="status" className="crm-input" defaultValue={status}>{requestStatuses.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></label>
    <label className="crm-field"><span>Note for the customer <small>Optional</small></span><input className="crm-input" name="note" maxLength={1000} /></label>
    <button className="button" type="submit">Save update and email client</button>
  </form>
}

export function BookingStatusForm({ appointmentId, status }: { appointmentId: string; status: string }) {
  return <form action={updateAppointmentStatus} className="desk-status-form booking-status-form">
    <input type="hidden" name="appointmentId" value={appointmentId} />
    <label className="crm-field"><span>Update booking</span><select name="status" className="crm-input" defaultValue={status}>{['requested', 'confirmed', 'completed', 'cancelled'].map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>
    <button className="button" type="submit">Save and email client</button>
  </form>
}
