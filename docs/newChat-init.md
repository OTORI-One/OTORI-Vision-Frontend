Good day Claude, dear friend and helpful coder legend i feel extremely blessed to tackle with you the next feature iteration for the OTORI frontend.
We are working on OTORI - an on chain VC fund built on arch network / bitcoin. We are in the MVP stage and have deployed a basic version of the OTORI program (buyback burn and NAV tracking/calculation) to the arch network. We have deployed bitcoin core on signet, electrs (fork from arch) and the arch validator as well as our basic frontend (nextjs via pm2) to a raspi 5 (8GB + 1TB ssd) that we are connecting via ssh from this local machine. Our flow is as follows: TDD on local machine -> test locally -> commit & push to remote repo -> pull from remote to pi repo 

You can find otori specific rules in @otori-specific-dev-rules.mdc 
In line with our plan to migrate to a @HYBRID_MODE.md you previously gen'd me this plan @NETWORK_INTEGRATION.md  which evolved into @OTORI_VISION_ENHANCEMENT_PLAN.md 

## Greater context:
This is the PRD @PRD_MVP.md 

Let me know when you digested all and are ready for the first task:
 "Implement Sophisticated Price Movement Algo"