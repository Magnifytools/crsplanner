# Verifying the CRS engine against IRCC's calculator

IRCC's calculator (canada.ca, "Check your score") computes in the browser: the submit handler of `#crs-form`
reads the selects and writes the breakdown into the page. The check runs inside that page:

1. Open https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/check-score.html
2. In the console, load our live engine and rules:
   `window.__crs = await import('https://crsplanner.com/js/crs.js')`, then parse `#crs-rules` and `#lang-rules`
   from https://crsplanner.com/ with DOMParser.
3. For each random profile: reset the form, pick a random option in every visible select (in question order, firing
   jQuery `change` so dependent selects fill), call `jQuery._data(form,'events').submit[0].handler`, read the
   subtotals ("Subtotal - Core/Human capital factors = N", etc.), map the option texts to our profile format and
   compare the five numbers.

Result on 2026-10-14: 1,000 profiles, 917 identical. The other 83 all contain a TCF Canada score at NCLC 4: IRCC's
tool scores it 0 (its `tcf` table, row "B", has 0 points) while the CRS criteria give 6 per ability for CLB/NCLC 4-5
(and the tool gives 6 for TEF at NCLC 4). Applying the tool's rule, all 83 match too. We follow the published criteria
and show a notice in the calculator when the result differs from IRCC's tool.
