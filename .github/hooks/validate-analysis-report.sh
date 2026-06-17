#!/bin/zsh

# Pre-commit hook for project analysis report validation
# Validates analysis reports before commit
# Install with: cp .github/hooks/validate-analysis-report.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

set -e

ANALYSIS_REPORTS_DIR=".github/templates/analysis-reports"
VALIDATION_ERRORS=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Validating project analysis reports..."

# Function to check if file contains required section
check_required_section() {
    local file=$1
    local section=$2
    if ! grep -q "^## $section" "$file"; then
        echo -e "${RED}✗ Missing required section: '## $section'${NC} in $file"
        ((VALIDATION_ERRORS++))
    fi
}

# Function to validate JSON evaluation grid
validate_json_grid() {
    local file=$1
    if ! python3 -m json.tool "$file" > /dev/null 2>&1; then
        echo -e "${RED}✗ Invalid JSON in evaluation grid: $file${NC}"
        ((VALIDATION_ERRORS++))
    fi
}

# Check for analysis report files being committed
STAGED_FILES=$(git diff --cached --name-only --diff-filter=A)

for file in $STAGED_FILES; do
    # Check Axis 1 reports
    if [[ "$file" =~ axis-1-.*\.md$ ]]; then
        echo "  Validating Axis 1 report: $file"
        check_required_section "$file" "Executive Summary"
        check_required_section "$file" "Finality Definition"
        check_required_section "$file" "Evaluation Grid"
        if grep -q "⚠️ SECURITY:" "$file"; then
            if ! grep -q "🔒 CONFIDENTIAL" "$file"; then
                echo -e "${YELLOW}⚠ Security finding without CONFIDENTIAL mark: $file${NC}"
                ((VALIDATION_ERRORS++))
            fi
        fi
    fi

    # Check Axis 2 reports
    if [[ "$file" =~ axis-2-.*\.md$ ]]; then
        echo "  Validating Axis 2 report: $file"
        check_required_section "$file" "Architecture Review"
        check_required_section "$file" "Technology Stack"
        check_required_section "$file" "Security Audit"
        check_required_section "$file" "Evaluation Grid"
        if grep -q "CRITICAL VULNERABILITY" "$file"; then
            if ! grep -q "🔒 CONFIDENTIAL" "$file"; then
                echo -e "${RED}✗ Critical vulnerability without CONFIDENTIAL mark: $file${NC}"
                ((VALIDATION_ERRORS++))
            fi
        fi
    fi

    # Check Axis 3 reports
    if [[ "$file" =~ axis-3-.*\.md$ ]]; then
        echo "  Validating Axis 3 report: $file"
        check_required_section "$file" "User Journeys"
        check_required_section "$file" "Accessibility Audit"
        check_required_section "$file" "Evaluation Grid"
    fi

    # Check Axis 4 reports (anonymity check)
    if [[ "$file" =~ axis-4-.*\.md$ ]]; then
        echo "  Validating Axis 4 report: $file"
        check_required_section "$file" "Anonymous Consolidation"
        if grep -qiE "said|told us|mentioned|team member|person.*said" "$file"; then
            echo -e "${YELLOW}⚠ Possible attribution found in anonymized report: $file${NC}"
            echo "  Ensure all team member statements are consolidated anonymously"
            ((VALIDATION_ERRORS++))
        fi
        check_required_section "$file" "Evaluation Grid"
    fi

    # Check Axis 5 reports
    if [[ "$file" =~ axis-5-.*\.md$ ]]; then
        echo "  Validating Axis 5 report: $file"
        check_required_section "$file" "Current Progress State"
        check_required_section "$file" "Critical Dependencies"
        check_required_section "$file" "Risk Mapping"
        check_required_section "$file" "Evaluation Grid"
    fi

    # Validate JSON evaluation grids
    if [[ "$file" =~ \.json$ && "$file" =~ evaluation-grids ]]; then
        echo "  Validating evaluation grid: $file"
        validate_json_grid "$file"
        
        # Check that all criteria have null score initially (can be edited)
        if [[ "$file" =~ axis.*-grid\.json$ ]]; then
            if ! grep -q '"score": null' "$file"; then
                echo -e "${YELLOW}⚠ Evaluation grid may have been pre-scored: $file${NC}"
                echo "  This is allowed but ensure scores are current/accurate"
            fi
        fi
    fi
done

# Check synthesis grid if present
SYNTHESIS_FILES=$(git diff --cached --name-only --diff-filter=M | grep "synthesis-grid.json")
if [[ -n "$SYNTHESIS_FILES" ]]; then
    for file in $SYNTHESIS_FILES; do
        echo "  Validating synthesis grid: $file"
        validate_json_grid "$file"
        # Ensure all axes have scores
        if ! grep -q '"score": [0-9]' "$file"; then
            echo -e "${YELLOW}⚠ Synthesis grid may be incomplete (no axis scores): $file${NC}"
        fi
    done
fi

# Final report
echo ""
if [[ $VALIDATION_ERRORS -eq 0 ]]; then
    echo -e "${GREEN}✓ All analysis reports validated successfully${NC}"
    exit 0
else
    echo -e "${RED}✗ Validation failed with $VALIDATION_ERRORS error(s)${NC}"
    echo "  Fix issues above and stage again (git add)"
    echo "  To skip validation: git commit --no-verify (not recommended)"
    exit 1
fi
