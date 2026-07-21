import { IconCheck } from '@tabler/icons-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getAllTemplates } from '../templates/registry';

interface TemplateSelectionProps {
  selectedTemplate: string;
  onTemplateSelect: (templateId: string) => void;
  onApplyTemplate: (templateId: string) => void;
  currentTemplate: string;
}

export function TemplateSelection({
  selectedTemplate,
  onTemplateSelect,
  onApplyTemplate,
  currentTemplate
}: TemplateSelectionProps) {
  const templates = getAllTemplates();
  const hasPendingSelection = selectedTemplate !== currentTemplate;

  return (
    <div className='flex flex-col gap-5'>
      <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
        <div className='flex flex-col gap-1'>
          <h2 className='text-xl font-bold md:text-2xl'>Choose Template</h2>
          <p className='text-muted-foreground text-sm'>
            Preview different templates before applying
          </p>
        </div>
        {hasPendingSelection && (
          <div className='flex shrink-0 gap-2'>
            <Button
              size='sm'
              variant='outline'
              onClick={() => onTemplateSelect(currentTemplate)}
            >
              Cancel
            </Button>
            <Button size='sm' onClick={() => onApplyTemplate(selectedTemplate)}>
              Apply
            </Button>
          </div>
        )}
      </div>

      <div className='grid grid-cols-1 gap-4 min-[480px]:grid-cols-2'>
        {templates.map((template) => {
          const isSelected = selectedTemplate === template.id;

          return (
            <Card
              key={template.id}
              onClick={() => onTemplateSelect(template.id)}
              className={cn(
                'group hover:border-primary/60 cursor-pointer gap-0 overflow-hidden py-0 transition-all hover:shadow-md',
                isSelected && 'border-primary ring-primary ring-1'
              )}
            >
              <CardContent className='flex flex-col gap-3 p-3'>
                <div className='bg-muted relative aspect-[210/297] overflow-hidden rounded-md border'>
                  <Image
                    src={template.thumbnail ?? ''}
                    alt={template.name}
                    fill
                    sizes='(max-width: 480px) 100vw, 240px'
                    className='object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]'
                  />
                  {isSelected && (
                    <span className='bg-primary text-primary-foreground absolute top-2 right-2 flex size-6 items-center justify-center rounded-full shadow-sm'>
                      <IconCheck className='size-4' />
                    </span>
                  )}
                </div>

                <div className='flex flex-col gap-1.5'>
                  <h3 className='leading-tight font-semibold'>
                    {template.name}
                  </h3>
                  <p className='text-muted-foreground text-sm leading-snug'>
                    {template.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
