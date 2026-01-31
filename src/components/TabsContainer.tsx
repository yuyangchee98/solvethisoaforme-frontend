import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import AntecedentBasisChecker from './AntecedentBasisChecker';

export default function TabsContainer() {
  return (
    <Tabs defaultValue="antecedent" className="flex-1 flex flex-col min-h-0">
      <TabsList className="w-fit">
        <TabsTrigger value="agent">Agent</TabsTrigger>
        <TabsTrigger value="antecedent">Check Antecedent Basis</TabsTrigger>
      </TabsList>

      <TabsContent value="agent" className="flex-1 mt-4">
        <div className="h-full flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
          <p className="text-muted-foreground">Agent tab - Coming soon</p>
        </div>
      </TabsContent>

      <TabsContent value="antecedent" className="flex-1 mt-4 min-h-0">
        <AntecedentBasisChecker />
      </TabsContent>
    </Tabs>
  );
}
