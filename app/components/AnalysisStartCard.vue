<script setup lang="ts">
import { Search, Upload, User } from '@lucide/vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
</script>

<template>
  <Card class="w-full shadow-xl">
    <CardHeader>
      <CardTitle class="text-xl">Start Your Analysis</CardTitle>
      <CardDescription>
        Upload a PGN file, provide your username from Lichess or Chess.com, or track an existing
        analysis.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <Tabs default-value="upload" class="gap-6">
        <!-- Short labels below `sm`: the full ones don't fit a 375px card and cause sideways scroll. -->
        <TabsList class="w-full">
          <TabsTrigger value="upload">
            <Upload />
            <span class="sm:hidden">Upload</span>
            <span class="hidden sm:inline">Upload PGN File</span>
          </TabsTrigger>
          <TabsTrigger value="username">
            <User />
            <span class="sm:hidden">Username</span>
            <span class="hidden sm:inline">Enter Username</span>
          </TabsTrigger>
          <TabsTrigger value="track">
            <Search />
            <span class="sm:hidden">Track</span>
            <span class="hidden sm:inline">Track Progress</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upload"><UploadPgnForm /></TabsContent>
        <TabsContent value="username"><ExternalUserForm /></TabsContent>
        <TabsContent value="track"><TrackProgressForm /></TabsContent>
      </Tabs>
    </CardContent>
  </Card>
</template>
