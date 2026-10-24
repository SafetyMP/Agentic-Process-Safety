"""Generated invariants exercise the real OPA runtime, not a substitute evaluator."""
import unittest
from hypothesis import given, settings, strategies as st
from aps_governance.contracts import ROOT
from aps_governance.policy import PolicyEngine

class PolicyProperties(unittest.TestCase):
    @classmethod
    def setUpClass(cls): cls.engine=PolicyEngine(ROOT/'policies/v1')
    def facts(self, amount, budget, spent=0, human=False):
        return {'actor':'purchase','action':'purchase_mock','identity_ok':True,'context_ok':True,'capability_ok':True,
                'depth':1,'state_ok':True,'stage_ok':True,'payload_ok':True,'amount':amount,'spent':spent,
                'budget':budget,'approval_ok':True,'approver':'finance','human_ok':human}
    @settings(max_examples=40,derandomize=True,deadline=None,database=None)
    @given(amount=st.integers(0,1500),budget=st.integers(0,1500),spent=st.integers(0,1000),human=st.booleans())
    def test_allow_implies_budget_cap_and_review_authority(self,amount,budget,spent,human):
        decision=self.engine.simulate(self.facts(amount,budget,spent,human))['decision']
        if decision=='allow':
            self.assertLessEqual(amount+spent,budget)
            self.assertLessEqual(amount+spent,self.engine.config['spend_cap'])
            self.assertTrue(human or amount<=self.engine.config['human_threshold'])
        if amount+spent>min(budget,self.engine.config['spend_cap']):self.assertEqual(decision,'deny')
    @settings(max_examples=30,derandomize=True,deadline=None,database=None)
    @given(amount=st.integers(0,1000),budget=st.integers(0,1500),reduction=st.integers(0,1500))
    def test_reducing_budget_cannot_create_allow(self,amount,budget,reduction):
        original=self.engine.simulate(self.facts(amount,budget))['decision']
        reduced=self.engine.simulate(self.facts(amount,max(0,budget-reduction)))['decision']
        if original!='allow':self.assertNotEqual(reduced,'allow')
    @settings(max_examples=30,derandomize=True,deadline=None,database=None)
    @given(depth=st.integers(4,1000000),human=st.booleans(),amount=st.integers(0,1000))
    def test_human_grants_never_override_depth_ceiling(self,depth,human,amount):
        facts=self.facts(amount,1000,human=human);facts['depth']=depth
        self.assertEqual(self.engine.simulate(facts)['decision'],'deny')

if __name__=='__main__':unittest.main()
