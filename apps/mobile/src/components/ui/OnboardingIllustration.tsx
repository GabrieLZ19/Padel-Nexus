import { LinearGradient } from "expo-linear-gradient";
import { Platform, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

type SlideIcon = "calendar" | "trophy" | "ranking";

interface OnboardingIllustrationProps {
  icon: SlideIcon;
}

function CalendarIcon() {
  return (
    <Svg width={34} height={34} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 3v2M17 3v2M4 9h16M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        stroke="#000"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M8 13h3M13 13h3M8 17h3"
        stroke="#000"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function TrophyIcon() {
  return (
    <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 3h8v4.2a4 4 0 0 1-8 0V3Z"
        stroke="#000"
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <Path
        d="M6.5 6H5a2 2 0 0 0 0 4h1.5M17.5 6H19a2 2 0 0 1 0 4h-1.5"
        stroke="#000"
        strokeWidth={1.7}
        strokeLinecap="round"
      />
      <Path
        d="M9.5 14h5v2.2a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V14Z"
        stroke="#000"
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <Path
        d="M8 20h8"
        stroke="#000"
        strokeWidth={1.7}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function RankingIcon() {
  return (
    <Svg width={34} height={34} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4l1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4L6.2 8.2l4-.6L12 4Z"
        stroke="#000"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SlideGlyph({ icon }: { icon: SlideIcon }) {
  if (icon === "calendar") return <CalendarIcon />;
  if (icon === "trophy") return <TrophyIcon />;
  return <RankingIcon />;
}

export function OnboardingIllustration({ icon }: OnboardingIllustrationProps) {
  return (
    <View className="h-72 w-full items-center justify-center overflow-hidden rounded-card">
      <LinearGradient
        colors={["#1A2410", "#101510", "#0A0A0A"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: "#2A2A2A",
        }}
      />
      <Svg
        width={280}
        height={280}
        style={{ position: "absolute", opacity: 0.08 }}
        viewBox="0 0 280 280"
      >
        <Circle cx={140} cy={140} r={90} stroke="#6E8901" strokeWidth={0.8} />
      </Svg>
      <View
        className="items-center justify-center rounded-full bg-brand-chartreuse"
        style={
          Platform.OS === "ios"
            ? {
                width: 112,
                height: 112,
                shadowColor: "#CBFE01",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.35,
                shadowRadius: 24,
              }
            : {
                width: 112,
                height: 112,
                elevation: 10,
              }
        }
      >
        <SlideGlyph icon={icon} />
      </View>
    </View>
  );
}
