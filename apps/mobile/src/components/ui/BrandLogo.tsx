import type { SvgProps } from "react-native-svg";

import LogoAccessorySvg from "@/assets/brand/LogoAccessory.svg";
import LogoHorizontalSvg from "@/assets/brand/LogoHorizontal.svg";
import LogoSvg from "@/assets/brand/Logo.svg";

interface LogoAccessoryProps extends SvgProps {
  size?: number;
}

interface LogoSizedProps extends SvgProps {
  width?: number;
}

export function LogoAccessory({ size = 56, ...props }: LogoAccessoryProps) {
  return <LogoAccessorySvg width={size} height={size} {...props} />;
}

export function LogoHorizontal({ width = 220, ...props }: LogoSizedProps) {
  const height = (width * 70) / 333;
  return <LogoHorizontalSvg width={width} height={height} {...props} />;
}

export function LogoFull({ width = 180, ...props }: LogoSizedProps) {
  const height = (width * 147) / 179;
  return <LogoSvg width={width} height={height} {...props} />;
}
