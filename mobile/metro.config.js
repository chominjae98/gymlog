const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Metro 기본 캐시 위치(os.tmpdir()/metro-cache, 즉 Windows 사용자 임시폴더)에서
// 캐시 파일을 대량으로 동시에 열다가 "EMFILE: too many open files"로 번들링
// 자체가 죽는 문제가 이 환경에서 재현됨(백신 실시간 검사 등으로 그 폴더의 파일
// 핸들 회수가 느려지는 것으로 추정). 캐시를 완전히 끄면 매번 전체를 재컴파일해야
// 해서 이번엔 반대로 메모리가 쌓이다 "heap out of memory"로 죽는 문제가 생겼다.
// 캐시 자체는 유지하되, 문제가 있는 시스템 임시폴더 대신 프로젝트 안의 전용
// 폴더를 쓰도록 위치만 옮겨서 두 문제를 동시에 피한다.
config.maxWorkers = 2;
config.cacheStores = ({ FileStore }) => [
  new FileStore({ root: path.join(__dirname, ".metro-cache") }),
];

module.exports = withNativeWind(config, { input: "./src/global.css" });
