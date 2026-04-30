// ─── Generated components ─────────────────────────────────────────────────────
export { Appshell }    from '../02-generated/Appshell/Appshell';
export { Badge }       from '../02-generated/Badge/Badge';
export { ButtonMenu }  from '../02-generated/ButtonMenu/ButtonMenu';
export { Checkbox }    from '../02-generated/Checkbox/Checkbox';
export { ContentBox }  from '../02-generated/ContentBox/ContentBox';
export { Drawer }      from '../02-generated/Drawer/Drawer';
export { Modal }       from '../02-generated/Modal/Modal';
export { MultiSelect } from '../02-generated/MultiSelect/MultiSelect';
export { Select }      from '../02-generated/Select/Select';
export { DataTable }   from '../02-generated/Table/Table';

// ─── Mantine layout & display primitives ──────────────────────────────────────
// Curated set — names that don't collide with our custom components above.
// Components we wrap (Badge, Checkbox, Drawer, Modal, MultiSelect, Select) are
// intentionally omitted; use our custom versions instead.
export {
  Box,
  Stack,
  Group,
  Flex,
  Grid,
  SimpleGrid,
  Center,
  Container,
  AspectRatio,
  Divider,
  Space,
  ScrollArea,
  Text,
  Title,
  Code,
  Mark,
  Anchor,
  Paper,
  Avatar,
  Image,
  Loader,
  Skeleton,
  Progress,
  RingProgress,
  Overlay,
  Tooltip,
  HoverCard,
  Popover,
  Alert,
  Notification,
  Tabs,
  Pagination,
  Stepper,
  Accordion,
  ActionIcon,
  CloseButton,
  Burger,
  Chip,
  Switch,
  Radio,
  Slider,
  RangeSlider,
  NumberInput,
  ColorInput,
  // Aliased to avoid collision with our wrapped components
  Button    as MantineButton,
  TextInput as MantineTextInput,
  Textarea  as MantineTextarea,
  Table     as MantineTable,
  Menu      as MantineMenu,
} from '@mantine/core';

// ─── Story helpers ────────────────────────────────────────────────────────────
// Explicit named imports — avoids export* collisions (story files all export
// Story/Meta objects with the same names: Showcase, Default, Open, etc.)
export { NavSlot, AsideSlot, MainContent } from '../02-generated/Appshell/Appshell.stories';
export { defaultItems }                    from '../02-generated/ButtonMenu/ButtonMenu.stories';
export { RegistrationForm }               from '../02-generated/Modal/Modal.stories';
export { FRUIT_OPTIONS }                  from '../02-generated/Select/Select.stories';
export {
  COLUMNS,
  SORTABLE_COLUMNS,
  DATA,
  FOOTER_DATA,
  PARTIAL_FOOTER_DATA,
} from '../02-generated/Table/Table.stories';

// ─── Tabler icons ─────────────────────────────────────────────────────────────
export * from '@tabler/icons-react';
