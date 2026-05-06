import clsx from 'clsx';
import { COLORS } from '../../utils/constants';

export default function Sidebar({ className, ...props }) {
  return (
    <aside
      className={clsx('w-64 border-r p-4', className)}
      style={{ backgroundColor: COLORS.card, borderColor: COLORS.border }}
      {...props}
    >
      <h2 className="text-lg font-bold mb-4" style={{ color: COLORS.accent }}>
        Sidebar
      </h2>
    </aside>
  );
}
