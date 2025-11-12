import svgPaths from "./svg-s9kzu9g8kf";

function Logo() {
  return (
    <svg className="block h-full w-full" fill="none" viewBox="0 0 278 261" role="img" aria-label="Glacia logo">
      <path
        d={svgPaths.p28e3a840}
        stroke="url(#paint0_linear_1_62)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="13.7513"
      />
      <defs>
        <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_62" x1="94.2489" x2="386.262" y1="-118.504" y2="66.7344">
          <stop stopColor="#93FAEE" />
          <stop offset="0.522478" stopColor="#0C10FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function LogoMarkV() {
  return (
    <div className="relative rounded-[24px] size-full" data-name="LogoMark - V1">
      <div className="flex items-center justify-center p-2">
        <div className="h-[120px] w-[120px]">
          <Logo />
        </div>
      </div>
    </div>
  );
}
