# VHS Demo Tape for tspub
# Generate with: vhs docs/demo.tape
# Install VHS: https://github.com/charmbracelet/vhs

Output docs/demo.gif

Set Shell "bash"
Set FontSize 16
Set Width 900
Set Height 500
Set Theme "Catppuccin Mocha"
Set Padding 20
Set Margin 20
Set BorderRadius 10
Set TypingSpeed 50ms

# Title
Type "# tspub - Ship TypeScript packages without the chaos"
Enter
Sleep 1s

# Clear and show check command
Type "clear"
Enter
Sleep 500ms

Type "npx tspub check"
Enter
Sleep 3s

# Show fixing
Type "npx tspub check --fix"
Enter
Sleep 2s

# Clear and show doctor
Type "clear"
Enter
Sleep 500ms

Type "npx tspub doctor"
Enter
Sleep 3s

# Clear and show publish dry-run
Type "clear"
Enter
Sleep 500ms

Type "npx tspub publish patch --dry-run"
Enter
Sleep 3s

# Final message
Type "clear"
Enter
Sleep 500ms

Type "# One CLI. 60 rules. Auto-fix. Zero config."
Enter
Sleep 500ms

Type "# npm install -D tspub"
Enter
Sleep 2s
