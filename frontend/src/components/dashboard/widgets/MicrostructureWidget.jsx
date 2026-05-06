import clsx from 'clsx';
import { COLORS } from '../../utils/constants';

export default function MicrostructureWidget() {
  return (
    <div className="p-4 rounded-lg" style={{ backgroundColor: COLORS.card }}>
      <h3 className="text-sm font-semibold" style={{ color: COLORS.cyan }}>
        MicrostructureWidget
      </h3>
    </div>
  );
}
