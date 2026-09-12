/**
 * The app's entire icon set, sourced exclusively from Hugeicons' free
 * "Stroke Rounded" set (https://hugeicons.com/icons/stroke-rounded) — no
 * other icon library or glyph is used anywhere in the product.
 *
 * Each export below is a drop-in replacement for the lucide-react icon of
 * the same name: same call signature (`size`, `className`, `style`,
 * `strokeWidth`, ...), same default size (24) and `currentColor` stroke, so
 * every existing call site keeps working — only the import source changes,
 * e.g. `from 'lucide-react'` -> `from '../lib/icons'`.
 */
import { HugeiconsIcon } from '@hugeicons/react'
import type { ComponentProps } from 'react'
import {
  ArrowLeft02Icon, ArrowRight02Icon, ArrowUpRight02Icon,
  Alert01Icon, Award01Icon, ChartColumnIcon, BellIcon,
  Calendar01Icon, Calendar03Icon, CalendarOffIcon, CalendarAdd01Icon,
  Tick02Icon, CheckmarkCircle02Icon, ArrowLeft01Icon, ArrowRight01Icon,
  Task01Icon, Clock01Icon, Copy01Icon, CreditCardIcon, Download01Icon,
  Edit02Icon, EyeIcon, LinkSquare02Icon, Note01Icon, FilterIcon, Globe02Icon,
  HeartHandshakeIcon, HelpCircleIcon, LanguagesIcon, GridViewIcon,
  Location01Icon, Menu01Icon, MoreHorizontalIcon, MoreVerticalIcon,
  NotebookIcon, PlusSignIcon, RefreshIcon, Search01Icon, Settings01Icon,
  Shield01Icon, ShieldCheckIcon, PreferenceHorizontalIcon, SparklesIcon,
  StethoscopeIcon, TrendingUpIcon, Delete02Icon, UserAdd01Icon,
  UserMultipleIcon, Video01Icon, Wallet01Icon, Cancel01Icon, CancelCircleIcon,
} from '@hugeicons/core-free-icons'

type IconProps = Omit<ComponentProps<typeof HugeiconsIcon>, 'icon'>
const make = (icon: ComponentProps<typeof HugeiconsIcon>['icon']) =>
  function Icon(props: IconProps) { return <HugeiconsIcon icon={icon} {...props} /> }

export const ArrowLeft = make(ArrowLeft02Icon)
export const ArrowRight = make(ArrowRight02Icon)
export const ArrowUpRight = make(ArrowUpRight02Icon)
export const AlertTriangle = make(Alert01Icon)
export const Award = make(Award01Icon)
export const BarChart3 = make(ChartColumnIcon)
export const Bell = make(BellIcon)
export const Calendar = make(Calendar01Icon)
export const CalendarDays = make(Calendar03Icon)
export const CalendarOff = make(CalendarOffIcon)
export const CalendarPlus = make(CalendarAdd01Icon)
export const Check = make(Tick02Icon)
export const CheckCircle2 = make(CheckmarkCircle02Icon)
export const ChevronLeft = make(ArrowLeft01Icon)
export const ChevronRight = make(ArrowRight01Icon)
export const ClipboardList = make(Task01Icon)
export const Clock = make(Clock01Icon)
export const Clock3 = make(Clock01Icon)
export const Copy = make(Copy01Icon)
export const CreditCard = make(CreditCardIcon)
export const Download = make(Download01Icon)
export const Edit3 = make(Edit02Icon)
export const Eye = make(EyeIcon)
export const ExternalLink = make(LinkSquare02Icon)
export const FileText = make(Note01Icon)
export const Filter = make(FilterIcon)
export const Globe = make(Globe02Icon)
export const HeartHandshake = make(HeartHandshakeIcon)
export const HelpCircle = make(HelpCircleIcon)
export const Languages = make(LanguagesIcon)
export const LayoutDashboard = make(GridViewIcon)
export const MapPin = make(Location01Icon)
export const Menu = make(Menu01Icon)
export const MoreHorizontal = make(MoreHorizontalIcon)
export const MoreVertical = make(MoreVerticalIcon)
export const NotebookText = make(NotebookIcon)
export const Plus = make(PlusSignIcon)
export const Repeat2 = make(RefreshIcon)
export const Search = make(Search01Icon)
export const Settings = make(Settings01Icon)
export const Shield = make(Shield01Icon)
export const ShieldCheck = make(ShieldCheckIcon)
export const SlidersHorizontal = make(PreferenceHorizontalIcon)
export const Sparkles = make(SparklesIcon)
export const Stethoscope = make(StethoscopeIcon)
export const TrendingUp = make(TrendingUpIcon)
export const Trash2 = make(Delete02Icon)
export const UserPlus = make(UserAdd01Icon)
export const Users = make(UserMultipleIcon)
export const Video = make(Video01Icon)
export const Wallet = make(Wallet01Icon)
export const X = make(Cancel01Icon)
export const XCircle = make(CancelCircleIcon)
