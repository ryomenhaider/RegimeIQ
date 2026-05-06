import clsx from 'clsx';
import { COLORS } from '../../../utils/constants';

export default function AltDataWidget() {
  return (
    <div className="p-4 rounded-lg" style={{ backgroundColor: COLORS.card }}>
      <h3 className="text-sm font-semibold" style={{ color: COLORS.yellow }}>
        AltDataWidget
      </h3>
    </div>
  );
}
