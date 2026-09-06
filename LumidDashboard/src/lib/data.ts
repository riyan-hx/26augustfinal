export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show'
export type Patient = {
  id: string
  name: string
  email: string
  phone: string
  sessions: number
  lastSession: string
  nextSession: string | null
  focus: string
  status: 'active' | 'lapsed' | 'new'
  avatar: string
}
export type SessionItem = {
  time: string
  patient: string
  type: string
  paid: boolean
  meeting?: string
}

export const patients: Patient[] = [
  { id: '1', name: 'Divya Prasad', email: 'divya@email.com', phone: '+91 98765 43210', sessions: 8, lastSession: '2 days ago', nextSession: 'Today, 5:00 PM', focus: 'Work-related overwhelm', status: 'active', avatar: 'DP' },
  { id: '2', name: 'Vikram Shetty', email: 'vikram@email.com', phone: '+91 98765 43211', sessions: 1, lastSession: '—', nextSession: 'Today, 6:30 PM', focus: 'Initial consultation', status: 'new', avatar: 'VS' },
  { id: '3', name: 'Arjun Nair', email: 'arjun@email.com', phone: '+91 98765 43212', sessions: 5, lastSession: '6 days ago', nextSession: 'Today, 8:00 PM', focus: 'Performance anxiety', status: 'active', avatar: 'AN' },
  { id: '4', name: 'Sneha Kulkarni', email: 'sneha@email.com', phone: '+91 98765 43213', sessions: 8, lastSession: '5 days ago', nextSession: null, focus: 'Relationship patterns', status: 'lapsed', avatar: 'SK' },
  { id: '5', name: 'Lakshmi Iyer', email: 'lakshmi@email.com', phone: '+91 98765 43214', sessions: 12, lastSession: 'Yesterday', nextSession: 'Tomorrow, 11:00 AM', focus: 'Self-compassion', status: 'active', avatar: 'LI' },
  { id: '6', name: 'Ritu Bansal', email: 'ritu@email.com', phone: '+91 98765 43215', sessions: 4, lastSession: '7 days ago', nextSession: null, focus: 'Academic avoidance', status: 'lapsed', avatar: 'RB' },
  { id: '7', name: 'Rahul Sharma', email: 'rahul@email.com', phone: '+91 98765 43216', sessions: 6, lastSession: '7 days ago', nextSession: 'Follow-up due', focus: 'Academic avoidance', status: 'active', avatar: 'RS' },
  { id: '8', name: 'Meera Nair', email: 'meera@email.com', phone: '+91 98765 43217', sessions: 3, lastSession: '3 days ago', nextSession: null, focus: 'Work-related overwhelm', status: 'active', avatar: 'MN' },
]

export const todaySchedule: SessionItem[] = [
  { time: '5:00 PM', patient: 'Divya Prasad', type: 'Individual Session', paid: true, meeting: 'Google Meet' },
  { time: '6:30 PM', patient: 'Vikram Shetty', type: 'Initial Consultation', paid: true, meeting: 'Google Meet' },
  { time: '8:00 PM', patient: 'Arjun Nair', type: 'Individual Session', paid: false, meeting: '—' },
]

export const bookings = [
  { id: 'B-1024', patient: 'Divya Prasad', date: 'Today · 5:00 PM', type: 'Individual Session', amount: '₹1,500', status: 'confirmed' as BookingStatus },
  { id: 'B-1025', patient: 'Vikram Shetty', date: 'Tomorrow · 10:00 AM', type: 'Initial Consultation', amount: '₹2,000', status: 'confirmed' as BookingStatus },
  { id: 'B-1026', patient: 'Arjun Nair', date: 'Tomorrow · 6:30 PM', type: 'Individual Session', amount: '₹1,500', status: 'pending' as BookingStatus },
  { id: 'B-1027', patient: 'Sneha Kulkarni', date: 'Fri · 3:00 PM', type: 'Individual Session', amount: '₹1,500', status: 'pending' as BookingStatus },
  { id: 'B-1028', patient: 'Lakshmi Iyer', date: '24 Aug · 11:00 AM', type: 'Individual Session', amount: '₹1,500', status: 'completed' as BookingStatus },
  { id: 'B-1029', patient: 'Ritu Bansal', date: '23 Aug · 4:00 PM', type: 'Individual Session', amount: '₹2,000', status: 'cancelled' as BookingStatus },
]

export const followUps = [
  { id: '1', patient: 'Rahul Sharma', due: 'Due today', note: 'Follow-up requested after discussing academic avoidance.', lastSession: '7 days ago', avatar: 'RS' },
  { id: '2', patient: 'Sneha Kulkarni', due: 'Due in 2 days', note: 'Check on progress with first recovery commitment.', lastSession: '5 days ago', avatar: 'SK' },
  { id: '3', patient: 'Ritu Bansal', due: 'Overdue • 3 days', note: 'Performance expectations discussion follow-up.', lastSession: '7 days ago', avatar: 'RB' },
]

export const timelineEvents = [
  { date: 'AUG 25', title: 'Session completed', desc: 'Discussed academic avoidance — task initiation improved slightly.', source: 'Psychologist note', dot: 'active' },
  { date: 'AUG 18', title: 'Patient check-in', desc: '"I’m still avoiding the presentation." — shared via Lumid', source: 'Patient check-in', dot: '' },
  { date: 'AUG 11', title: 'Completed action', desc: 'Completed first recovery commitment: 25-min focused work block', source: 'Patient reflection', dot: '' },
  { date: 'AUG 03', title: 'Initial consultation', desc: 'Difficulty starting important tasks after high-pressure situations', source: 'Session', dot: '' },
]
