import re

with open('client/pages/Index.tsx', 'r') as f:
    content = f.read()

index_start = content.find('export default function Index() {')
end_handleMagic = content.find('  const features = [')
end_nav = content.find('  return (\n    <div className="min-h-screen bg-white">')

part_imports = content[:index_start]
part_index_start = content[index_start:end_handleMagic]
part_extracted = content[end_handleMagic:end_nav]
part_render = content[end_nav:]

# Fix part_index_start (remove unused state)
part_index_start = re.sub(
    r'  const \[mousePosition, setMousePosition\] = useState\(\{ x: 0, y: 0 \}\);\n', 
    '', 
    part_index_start
)
part_index_start = re.sub(
    r'  const \[isMenuOpen, setIsMenuOpen\] = useState\(false\);\n', 
    '', 
    part_index_start
)

# Un-indent extracted parts
extracted_lines = part_extracted.split('\n')
unindented_extracted = []
for line in extracted_lines:
    if line.startswith('  '):
        unindented_extracted.append(line[2:])
    else:
        unindented_extracted.append(line)
part_extracted_fixed = '\n'.join(unindented_extracted)

# Fix Navigation in extracted
part_extracted_fixed = part_extracted_fixed.replace(
    'const Navigation = () => {', 
    'const Navigation = ({ isSignedIn }: { isSignedIn: boolean }) => {\n  const [isMenuOpen, setIsMenuOpen] = useState(false);'
)

# Fix rendering in part_render
part_render = part_render.replace('<Navigation />', '<Navigation isSignedIn={isSignedIn} />')

# Remove dead mouse tracking div
mouse_div_pattern = r'      <div\n        className="fixed w-3 h-3 bg-gradient-to-r from-teal-400 to-purple-400 rounded-full pointer-events-none mix-blend-difference opacity-40 z-50"\n        style={{[^}]*}}\n      />\n\n'
part_render = re.sub(mouse_div_pattern, '', part_render)

# Combine everything
new_content = part_imports + part_extracted_fixed + '\n' + part_index_start + part_render

with open('client/pages/Index.tsx', 'w') as f:
    f.write(new_content)

print("Refactoring complete.")
