import clsx from 'clsx';
import { COLORS } from '../../utils/constants';

export default function Topbar({ className, ...props }) {
  return (
    <header
      className={clsx('px-6 py-4 border-b', className)}
      style={{ backgroundColor: COLORS.card, borderColor: COLORS.border }}
      {...props}
    >
      <h1 className="text-xl font-bold" style={{ color: COLORS.accent }}>
        Topbar
      </h1>
    </header>
  );
}
