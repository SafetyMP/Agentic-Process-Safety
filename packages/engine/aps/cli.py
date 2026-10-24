import argparse, json
from pathlib import Path
from jsonschema.exceptions import ValidationError
from .core import analyze, validate, review, export_csv, deduplicate

def main():
    p = argparse.ArgumentParser(description="APS Phase 1 sandbox HAZOP")
    sub = p.add_subparsers(dest="command", required=True)
    a = sub.add_parser("analyze"); a.add_argument("topology"); a.add_argument("scenarios"); a.add_argument("--out", required=True)
    v = sub.add_parser("validate"); v.add_argument("kind", choices=["topology","scenarios","hazard","report","simulation"]); v.add_argument("file")
    e = sub.add_parser("csv"); e.add_argument("file"); e.add_argument("--out", required=True)
    d = sub.add_parser("dedup"); d.add_argument("file"); d.add_argument("--out", required=True)
    r = sub.add_parser("review"); r.add_argument("file"); r.add_argument("id"); r.add_argument("action", choices=["accept","reject","assess","approve_requirement"])
    for key in ["actor","reason","out"]: r.add_argument("--"+key, required=True)
    r.add_argument("--human", action="store_true"); r.add_argument("--severity", type=int); r.add_argument("--likelihood",type=int); r.add_argument("--residual-risk",choices=["acceptable","unacceptable"])
    args=p.parse_args()
    load=lambda x:json.loads(Path(x).read_text())
    try:
        if args.command=="validate": validate(args.kind,load(args.file)); print("valid"); return
        if args.command=="csv": export_csv(load(args.file),args.out); return
        if args.command=="dedup": result=deduplicate(load(args.file))
        elif args.command=="analyze": result=analyze(load(args.topology),load(args.scenarios))
        else: result=review(load(args.file),args.id,args.action,args.actor,args.reason,args.human,args.severity,args.likelihood,args.residual_risk)
        Path(args.out).write_text(json.dumps(result,indent=2)+"\n")
    except (ValueError, KeyError, ValidationError) as exc: p.exit(2,str(exc)+"\n")
if __name__=="__main__": main()
