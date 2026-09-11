import Box from '@mui/material/Box';
import { shopSurface } from '../constants/shopSurface';

export function splitSansDigits(text: string): { text: string; digits: boolean }[] {
  return text
    .split(/(\d+)/)
    .filter((part) => part.length > 0)
    .map((part) => ({ text: part, digits: /^\d+$/.test(part) }));
}

type SansDigitsTextProps = {
  text: string;
  /** Tailwind classes for digit spans in non-MUI markup. */
  digitClassName?: string;
};

export function SansDigitsText({ text, digitClassName }: SansDigitsTextProps) {
  const parts = splitSansDigits(text);

  return (
    <>
      {parts.map((part, index) =>
        part.digits ? (
          digitClassName ? (
            <span key={index} className={digitClassName}>
              {part.text}
            </span>
          ) : (
            <Box
              component="span"
              key={index}
              sx={{
                ...shopSurface.amount,
                fontSize: 'inherit',
                fontWeight: 'inherit',
                lineHeight: 'inherit',
                letterSpacing: '0.02em',
              }}
            >
              {part.text}
            </Box>
          )
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}
