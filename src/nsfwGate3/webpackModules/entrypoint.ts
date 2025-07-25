import { greeting } from "@moonlight-mod/wp/nsfwGate3_someLibrary";

const logger = moonlight.getLogger("nsfwGate3/entrypoint");
logger.info("Hello from entrypoint!");
logger.info("someLibrary exports:", greeting);

const natives = moonlight.getNatives("nsfwGate3");
logger.info("node exports:", natives);
