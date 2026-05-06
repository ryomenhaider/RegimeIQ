import clsx from 'clsx';
import { COLORS, REGIME_COLORS } from '../../utils/constants';

export default function RegimeWidget() {
  return (
    <div className="p-4 rounded-lg" style={{ backgroundColor: COLORS.card }}>
      <h3 className="text-sm font-semibold" style={{ color: COLORS.accent }}>
        RegimeWidget
      </h3>
    </div>
  );
}
