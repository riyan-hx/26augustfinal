/**
 * Navigation-only icons for the app shell. Same source (Hugeicons free
 * "Stroke Rounded") and same call signature as src/lib/icons.tsx — kept here
 * so the shell can use a calmer, more specific set without touching the
 * shared icon module other features import.
 */
import { HugeiconsIcon } from '@hugeicons/react'
import type { ComponentProps } from 'react'
import {
  DashboardSquare01Icon, Calendar03Icon, Appointment02Icon, UserMultipleIcon,
  TaskDaily01Icon, CheckListIcon, Wallet03Icon, Link04Icon, Settings02Icon, Logout03Icon,
  Rocket01Icon, MoreHorizontalCircle01Icon,
} from '@hugeicons/core-free-icons'

type IconProps = Omit<ComponentProps<typeof HugeiconsIcon>, 'icon'>

export function NavOverview(props: IconProps) { return <HugeiconsIcon icon={DashboardSquare01Icon} {...props} /> }
export function NavCalendar(props: IconProps) { return <HugeiconsIcon icon={Calendar03Icon} {...props} /> }
export function NavBookings(props: IconProps) { return <HugeiconsIcon icon={Appointment02Icon} {...props} /> }
export function NavPatients(props: IconProps) { return <HugeiconsIcon icon={UserMultipleIcon} {...props} /> }
export function NavFollowUps(props: IconProps) { return <HugeiconsIcon icon={TaskDaily01Icon} {...props} /> }
export function NavSessions(props: IconProps) { return <HugeiconsIcon icon={CheckListIcon} {...props} /> }
export function NavEarnings(props: IconProps) { return <HugeiconsIcon icon={Wallet03Icon} {...props} /> }
export function NavYourPage(props: IconProps) { return <HugeiconsIcon icon={Link04Icon} {...props} /> }
export function NavSettings(props: IconProps) { return <HugeiconsIcon icon={Settings02Icon} {...props} /> }
export function NavSignOut(props: IconProps) { return <HugeiconsIcon icon={Logout03Icon} {...props} /> }
export function NavSetup(props: IconProps) { return <HugeiconsIcon icon={Rocket01Icon} {...props} /> }
export function NavMore(props: IconProps) { return <HugeiconsIcon icon={MoreHorizontalCircle01Icon} {...props} /> }
