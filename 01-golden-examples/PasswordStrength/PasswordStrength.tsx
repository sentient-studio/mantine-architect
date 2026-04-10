import { useState } from 'react';
import { IconCheck, IconX } from '@tabler/icons-react';
import { PasswordInput, Progress, type MantineSize } from '@mantine/core';
import classes from './PasswordStrength.module.css';

// ─── Constants ───────────────────────────────────────────────────────────────

const requirements = [
  { re: /[0-9]/, label: 'Includes number' },
  { re: /[a-z]/, label: 'Includes lowercase letter' },
  { re: /[A-Z]/, label: 'Includes uppercase letter' },
  { re: /[$&+,:;=?@#|'<>.^*()%!-]/, label: 'Includes special symbol' },
];

const iconSizes: Record<MantineSize, number> = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
};

// ─── Utilities ───────────────────────────────────────────────────────────────

function getStrength(password: string): number {
  let multiplier = password.length > 5 ? 0 : 1;
  requirements.forEach((req) => {
    if (!req.re.test(password)) multiplier += 1;
  });
  return Math.max(100 - (100 / (requirements.length + 1)) * multiplier, 0);
}

function getStrengthLevel(strength: number): 'weak' | 'moderate' | 'strong' {
  if (strength > 80) return 'strong';
  if (strength > 50) return 'moderate';
  return 'weak';
}

// ─── PasswordRequirement ─────────────────────────────────────────────────────

interface PasswordRequirementProps {
  meets: boolean;
  label: string;
  iconSize: number;
}

function PasswordRequirement({ meets, label, iconSize }: PasswordRequirementProps) {
  return (
    <div className={classes.requirement} data-meets={meets || undefined}>
      <span className={classes.requirementIcon} aria-hidden="true">
        {meets ? (
          <IconCheck size={iconSize} stroke={1.5} />
        ) : (
          <IconX size={iconSize} stroke={1.5} />
        )}
      </span>
      <span>{label}</span>
    </div>
  );
}

// ─── PasswordStrength ─────────────────────────────────────────────────────────

export interface PasswordStrengthProps {
  /** Input label */
  label?: string;
  /** Input placeholder */
  placeholder?: string;
  /** Controlled value */
  value?: string;
  /** Controlled onChange — receives plain string */
  onChange?: (value: string) => void;
  /** Controls input and requirement text size */
  size?: MantineSize;
}

export function PasswordStrength({
  label = 'Password',
  placeholder = 'Your password',
  value: controlledValue,
  onChange,
  size = 'md',
}: PasswordStrengthProps) {
  const [internalValue, setInternalValue] = useState('');
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (isControlled) {
      onChange?.(e.currentTarget.value);
    } else {
      setInternalValue(e.currentTarget.value);
    }
  }

  const strength = getStrength(value);
  const strengthLevel = getStrengthLevel(strength);
  const barColor =
    strengthLevel === 'strong' ? 'teal' : strengthLevel === 'moderate' ? 'yellow' : 'red';
  const hasValue = value.length > 0;
  const iconSize = iconSizes[size];

  return (
    <div className={classes.root} data-size={size} data-testid="password-strength">
      <PasswordInput
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        label={label}
        size={size}
        required
      />

      <div
        className={classes.bars}
        data-strength={hasValue ? strengthLevel : undefined}
        data-testid="strength-bars"
      >
        {Array(4)
          .fill(0)
          .map((_, index) => (
            <Progress
              className={classes.progressBar}
              classNames={{ section: classes.progressSection }}
              value={
                hasValue && index === 0
                  ? 100
                  : strength >= ((index + 1) / 4) * 100
                  ? 100
                  : 0
              }
              color={barColor}
              key={index}
              size={4}
              aria-label={`Password strength segment ${index + 1}`}
            />
          ))}
      </div>

      {hasValue && (
        <div className={classes.requirements} data-testid="requirements">
          <PasswordRequirement
            label="Has at least 6 characters"
            meets={value.length > 5}
            iconSize={iconSize}
          />
          {requirements.map((req) => (
            <PasswordRequirement
              key={req.label}
              label={req.label}
              meets={req.re.test(value)}
              iconSize={iconSize}
            />
          ))}
        </div>
      )}
    </div>
  );
}
